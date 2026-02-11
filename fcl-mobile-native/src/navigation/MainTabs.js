import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import HomeScreen from '../pages/HomeScreen';
import PlayersScreen from '../pages/PlayersScreen';
import AuctionScreen from '../pages/AuctionScreen';
import VideosScreen from '../pages/VideosScreen';
import ProfileScreen from '../pages/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{headerShown: false}}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Players" component={PlayersScreen} />
      <Tab.Screen name="Auction" component={AuctionScreen} />
      <Tab.Screen name="Videos" component={VideosScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
