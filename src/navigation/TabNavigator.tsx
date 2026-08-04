import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen } from '../screens/main/HomeScreen';
import { DiscoverScreen } from '../screens/main/DiscoverScreen';
import { LiveSetupScreen } from '../screens/main/LiveSetupScreen';
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
          backgroundColor: '#121212',
          borderTopWidth: 1,
          borderTopColor: '#2A2A2A',
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 12,
        },
        tabBarActiveTintColor: '#FF6B00',
        tabBarInactiveTintColor: '#777777',
        tabBarShowLabel: route.name !== 'Live',
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'Live') {
            return (
              <View className="items-center justify-center bg-[#FF6B00] w-14 h-14 rounded-full shadow-lg shadow-orange-500/50" style={{ marginTop: -24 }}>
                <Ionicons name="videocam" size={28} color="#FFFFFF" />
              </View>
            );
          }

          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Discover') {
            iconName = focused ? 'compass' : 'compass-outline';
          } else if (route.name === 'Activities') {
            iconName = focused ? 'cart' : 'cart-outline';
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
        options={{ title: t('tabs.home') || 'Ana Sayfa' }}
      />
      <Tab.Screen 
        name="Discover" 
        component={DiscoverScreen} 
        options={{ title: t('tabs.discover') || 'Keşfet' }}
      />
      <Tab.Screen 
        name="Live" 
        component={LiveSetupScreen} 
        options={{ title: 'Yayın' }}
      />
      <Tab.Screen 
        name="Activities" 
        component={ActivitiesScreen} 
        options={{ title: t('tabs.activities') || 'Sepet' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ title: t('tabs.profile') || 'Hesabım' }}
      />
    </Tab.Navigator>
  );
};
