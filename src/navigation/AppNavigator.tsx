import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import { AuthNavigator } from './AuthNavigator';
import { useAuthStore } from '../store/useAuthStore';

const Stack = createNativeStackNavigator();

import { LiveStreamRoomScreen } from '../screens/LiveStreamRoomScreen';
import { BroadcastRoomScreen } from '../screens/BroadcastRoomScreen';
import { SellerProfileScreen } from '../screens/main/SellerProfileScreen';
import { OnboardingScreen } from '../screens/main/OnboardingScreen';

export const AppNavigator = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Group>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen 
            name="Onboarding" 
            component={OnboardingScreen} 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="LiveStreamRoom" 
            component={LiveStreamRoomScreen} 
            options={{ presentation: 'fullScreenModal' }}
          />
          <Stack.Screen 
            name="BroadcastRoom" 
            component={BroadcastRoomScreen} 
            options={{ presentation: 'fullScreenModal' }}
          />
          <Stack.Screen 
            name="SellerProfile" 
            component={SellerProfileScreen} 
            options={{ headerShown: false }}
          />
        </Stack.Group>
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
};
