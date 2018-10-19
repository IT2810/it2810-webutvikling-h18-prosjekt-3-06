import React from 'react';
import PropTypes from 'prop-types';
import { AsyncStorage, Platform } from 'react-native';
import { Notifications, Permissions } from 'expo';
import cloneDeep from 'lodash/cloneDeep';
import moment from 'moment';
import uuid from 'uuid';
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
      events: [
        {
          key: uuid(),
          title: 'this is a past event',
          time: moment().subtract(13, 'hours'),
          description: 'this is an event',
          drinks: [
            {
              type: 'beer',
              alcoholInGrams: 19.39,
              timeStamp: moment().subtract(11, 'hours'),
            },
            {
              type: 'beer',
              alcoholInGrams: 19.39,
              timeStamp: moment().subtract(8, 'hours'),
            },
            {
              type: 'beer',
              alcoholInGrams: 19.39,
              timeStamp: moment().subtract(12, 'hours'),
            },
          ],
        },
        {
          key: uuid(),
          title: 'this is a testevent',
          description: 'this is an event',
          time: moment(),
          drinks: [],
        },
        {
          key: uuid(),
          title: 'this is an upcoming event',
          description: 'this is an event',
          time: moment().add(6, 'hours'),
          drinks: [],
        },
      ],
      notificationId: -1,

      setStorageAndState: async (key, value) => this.setStorageAndState(key, value),
      addDrinkAsync: async (drinkObject, key) => this.addDrinkAsync(drinkObject, key),
      createEventAsync: async eventObject => this.createEventAsync(eventObject),
      getEventFromKey: key => this.getEventFromKey(key),
      notify: async drinkType => this.notify(drinkType),
    };
  }

  async componentDidMount() {
    // await AsyncStorage.clear(); //use this to clear asyncstorage for testing
    await AsyncStorage.getItem('@go-full:state')
      .then(result => JSON.parse(result))
      .then((result) => {
        if (result && result.events) {
          const makeEslintHappy = cloneDeep(result);
          makeEslintHappy.events = Serializer.deserializeState(result.events);
          return makeEslintHappy;
        }
        return result;
      })
      .then(result => this.setState(result))
      .catch(error => console.error(error));

    // We need to ask the user permission to send notifications in iOS.
    Permissions.askAsync(Permissions.NOTIFICATIONS);

    this.setupNotificationChannels();
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
    // Using cloneDeep to ensure immutability. Why is javascript always mutable :====)
    const tempState = cloneDeep(this.state);
    tempState[key] = value;
    this.setState(cloneDeep(tempState));
    const serializedState = Serializer.serializeState(tempState.events);
    tempState.events = serializedState;
    storeData(tempState);
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
    // making unique keys. This won't work if we should be able to delete events
    newEvent.key = uuid();
    newEvent.drinks = newEvent.drinks ? newEvent.drinks : [];
    tempState.events.push(newEvent);
    await this.setStorageAndState('events', tempState.events);
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
