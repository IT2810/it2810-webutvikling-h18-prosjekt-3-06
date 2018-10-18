import React from 'react';
import PropTypes from 'prop-types';
import { AsyncStorage, Platform } from 'react-native';
import { Notifications } from 'expo';
import cloneDeep from 'lodash/cloneDeep';
import uniqueId from 'lodash/uniqueId';
import moment from 'moment';
import Serializer from '../../utils/serialization';
import notificationUtil from '../../utils/notifications';

export const AppContext = React.createContext();

const storeData = async (data) => {
  try {
    await AsyncStorage.setItem('@go-full:state', JSON.stringify(data));
  } catch (error) {
    console.error(error);
  }
};

class AppProvider extends React.Component {
  constructor(props) {
    super(props);
    this.state = {

      // This is where we set initial state
      events: [],
      notificationId: -1,

      setStorageAndState: (key, value) => this.setStorageAndState(key, value),
      addDrinkAsync: (drinkObject, key) => this.addDrinkAsync(drinkObject, key),
      addEventAsync: eventObject => this.addEventAsync(eventObject),
      getEventFromKey: key => this.getEventFromKey(key),
      notify: drinkType => this.notify(drinkType),
    };
  }

  async componentDidMount() {
    await AsyncStorage.getItem('@go-full:state')
      .then(result => JSON.parse(result))
      .then((result) => {
        if (result && result.events) {
          return Serializer.deserializeState(result);
        }
        return result;
      })
      .then(result => this.setState(result))
      .catch(error => console.error(error));

    this.setupNotificationChannels();
    await this.temporaryFunctionPleaseRemoveItsOnlyForTestingPurposesSoYeahGoodbyeAsync();
  }

  setupNotificationChannels() {
    if (Platform.OS === 'android') {
      // Channel for test notifications
      Notifications.createChannelAndroidAsync('test', {
        name: 'Test notifications',
        sound: true,
        priority: 'max',
        vibrate: true,
      });

      // Channel for mission critical notifications
      Notifications.createChannelAndroidAsync('mission-critical', {
        name: 'Test notifications',
        sound: true,
        priority: 'high',
        vibrate: true,
      });

      // Channel for less important notifications
      Notifications.createChannelAndroidAsync('nudge', {
        name: 'Test notifications',
        sound: true,
        priority: 'low',
        vibrate: true,
      });
    }
  }

  async setStorageAndState(key, value) {
    // Using cloneDeep to ensure immutability.
    const tempState = cloneDeep(this.state);
    tempState[key] = value;
    this.setState(tempState);
    const serializedState = Serializer.serializeState(tempState);
    await storeData(serializedState);
    return tempState;
  }

  getEventFromKey(key) {
    const { events } = this.state;
    return events.find(event => event.key === key);
  }

  async addDrinkAsync(drinkObject, eventKey) {
    const { events } = this.state;
    const tempState = cloneDeep(events);
    const currentEvent = tempState.findIndex(event => event.key === eventKey);
    tempState[currentEvent].drinks.push(drinkObject);
    this.setStorageAndState('events', tempState);
  }

  async notify(drinkType) {
    const { notificationId } = this.state;
    const notificationTexts = {
      beer: 'How is that beer going? Maybe it\'s time you had another?',
      drink: 'The bartender hasn\'t flipped a tumbler in like 10 minutes, time to make him work for his tips!',
      wine: 'That glass is looking pretty empty, time for a refill!',
    };
    notificationUtil.cancelNotification(notificationId);
    const newId = await notificationUtil.sendNotificationAsync(
      'You\'re looking sober!',
      notificationTexts[drinkType],
      'mission-critical',
      // uncomment this line, and comment out the line below, to test notifications that are FASTAH.
      // moment().add(10, 'seconds'),
      moment().add(15, 'minutes'),
    );
    this.setStorageAndState('notificationId', newId);
  }

  async createEventAsync(eventObject) {
    const tempState = cloneDeep(this.state);
    const newEvent = cloneDeep(eventObject);
    // trying to make unique keys. This won't work if we should be able to delete events
    newEvent.key = parseInt(uniqueId(), 10);
    tempState.events.push(newEvent);
    await this.setStorageAndState('events', tempState.events);
  }

  async temporaryFunctionPleaseRemoveItsOnlyForTestingPurposesSoYeahGoodbyeAsync() {
    const events = [
      {
        title: 'Steve jobs memorial',
        time: moment(),
        drinks: [
          {
            type: 'beer 0.5',
            alcoholInGrams: 19.39,
            timeStamp: moment(),
          },
          {
            type: 'beer 0.5',
            alcoholInGrams: 19.39,
            timeStamp: moment().add(1, 'hours'),
          },
          {
            type: 'beer 0.5',
            alcoholInGrams: 19.39,
            timeStamp: moment().add(6, 'hours'),
          },
        ],
      },
      {
        title: 'a',
        time: moment(),
        drinks: [],
      },
      {
        title: 'cool party i guess',
        time: moment(),
        drinks: [],
      },
    ];

    await events.forEach(async event => this.createEventAsync(event));
  }

  render() {
    const { children } = this.props;
    return (
      <AppContext.Provider value={this.state}>
        {children}
      </AppContext.Provider>
    );
  }
}

AppProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AppProvider;
