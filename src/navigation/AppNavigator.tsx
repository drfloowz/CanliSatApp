import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import { AuthNavigator } from './AuthNavigator';
import { useAuthStore } from '../store/useAuthStore';

const Stack = createNativeStackNavigator();

import { LiveStreamRoomScreen } from '../screens/LiveStreamRoomScreen';

export const AppNavigator = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Group>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen 
            name="LiveStreamRoom" 
            component={LiveStreamRoomScreen} 
            options={{ presentation: 'fullScreenModal' }}
          />
        </Stack.Group>
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
};
