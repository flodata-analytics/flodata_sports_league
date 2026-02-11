import {initializeApp} from 'firebase/app';
import {getReactNativePersistence, initializeAuth} from 'firebase/auth/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {initializeFirestore} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyA7lK5BiXhTuAwCJFVZq3DaSfnEyvNNCu4',
  authDomain: 'flodata-tournaments.firebaseapp.com',
  projectId: 'flodata-tournaments',
  storageBucket: 'flodata-tournaments.appspot.com',
  messagingSenderId: '555922157691',
  appId: '1:555922157691:web:11b1b3d0012b4d11def2de',
  measurementId: 'G-ZEDL3CJY73',
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
  ignoreUndefinedProperties: true,
});

export default app;
