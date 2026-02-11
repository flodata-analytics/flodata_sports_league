import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {AuthProvider, useAuth} from './context/AuthContext';
import MainTabs from './navigation/MainTabs';
import LoginScreen from './pages/LoginScreen';
import PlayerProfileScreen from './pages/PlayerProfileScreen';
import MatchDetailsScreen from './pages/MatchDetailsScreen';
import FullScorecardScreen from './pages/FullScorecardScreen';
import TeamDetailScreen from './pages/TeamDetailScreen';
import UmpireScreen from './pages/UmpireScreen';

const Stack = createNativeStackNavigator();

function RootStack() {
  const {currentUser} = useAuth();

  return (
    <Stack.Navigator>
      {!currentUser ? (
        <Stack.Screen name="Login" component={LoginScreen} options={{headerShown: false}} />
      ) : (
        <Stack.Screen name="MainTabs" component={MainTabs} options={{headerShown: false}} />
      )}
      <Stack.Screen name="PlayerProfile" component={PlayerProfileScreen} options={{title: 'Player Profile'}} />
      <Stack.Screen name="MatchDetails" component={MatchDetailsScreen} options={{title: 'Match Details'}} />
      <Stack.Screen name="FullScorecard" component={FullScorecardScreen} options={{title: 'Scorecard'}} />
      <Stack.Screen name="TeamDetail" component={TeamDetailScreen} options={{title: 'Team'}} />
      <Stack.Screen name="Umpire" component={UmpireScreen} options={{title: 'Umpire'}} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootStack />
      </NavigationContainer>
    </AuthProvider>
  );
}
