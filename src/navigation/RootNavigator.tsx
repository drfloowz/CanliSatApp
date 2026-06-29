import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import { LiveStreamRoomScreen } from '../screens/LiveStreamRoomScreen';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="LiveStreamRoom" component={LiveStreamRoomScreen} />
    </Stack.Navigator>
  );
};
