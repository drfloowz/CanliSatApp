import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import { LiveStreamRoomScreen } from '../screens/LiveStreamRoomScreen';
import { AuthNavigator } from './AuthNavigator';
import { useAuthStore } from '../store/useAuthStore';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen 
            name="LiveStreamRoom" 
            component={LiveStreamRoomScreen} 
            options={{ presentation: 'fullScreenModal' }}
          />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
};
