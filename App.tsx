import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import LobbyScreen from './screens/LobbyScreen';
import ChallengeStatusScreen from './screens/ChallengeStatusScreen';
import GameScreen from './screens/GameScreen';
import ProfileScreen from './screens/profile';
import SpectatorScreen from './screens/GameSpectatorScreen';
import SeriesScreen from './screens/game_series_screen';
import StatsScreen from './screens/StatsScreen';
import LeaderboardScreen from './screens/userstats';

const Stack = createNativeStackNavigator();

const App = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Welcome" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="Lobby" component={LobbyScreen} />
          <Stack.Screen name="ChallengeStatus" component={ChallengeStatusScreen} />
          <Stack.Screen name="Game" component={GameScreen} />
          <Stack.Screen name="Series" component={SeriesScreen} />
          <Stack.Screen name="LeaderboardScreen" component={LeaderboardScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Spectator" component={SpectatorScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
};

export default App;