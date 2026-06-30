import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen } from '../screens/main/HomeScreen';
import { DiscoverScreen } from '../screens/main/DiscoverScreen';
import { ActivitiesScreen } from '../screens/main/ActivitiesScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';

const Tab = createBottomTabNavigator();

export const TabNavigator = () => {
  const { t } = useTranslation();

  return (
    <Tab.Navigator 
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#09090b', // zinc-950
          borderTopColor: '#27272a', // zinc-800
        },
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#71717a', // zinc-500
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Discover') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Activities') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ title: t('tabs.home') }}
      />
      <Tab.Screen 
        name="Discover" 
        component={DiscoverScreen} 
        options={{ title: t('tabs.discover') }}
      />
      <Tab.Screen 
        name="Activities" 
        component={ActivitiesScreen} 
        options={{ title: t('tabs.activities') }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ title: t('tabs.profile') }}
      />
    </Tab.Navigator>
  );
};
