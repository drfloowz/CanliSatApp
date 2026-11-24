import React from 'react';
import { Platform, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen } from '../screens/main/HomeScreen';
import { DiscoverScreen } from '../screens/main/DiscoverScreen';
import { SellScreen } from '../screens/sell/SellScreen';
import { ActivitiesScreen } from '../screens/main/ActivitiesScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';

const Tab = createBottomTabNavigator();

const ICONS: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  Home: ['home', 'home-outline'],
  Discover: ['compass', 'compass-outline'],
  Activities: ['receipt', 'receipt-outline'],
  Profile: ['person', 'person-outline'],
};

export const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: {
        backgroundColor: '#121212',
        borderTopColor: '#232323',
        height: Platform.OS === 'ios' ? 88 : 68,
        paddingBottom: Platform.OS === 'ios' ? 28 : 10,
        paddingTop: 10,
      },
      tabBarActiveTintColor: '#FF6B00',
      tabBarInactiveTintColor: '#777',
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      tabBarIcon: ({ focused, color, size }) => {
        if (route.name === 'Live') {
          return (
            <View style={{ marginTop: -22 }} className="w-14 h-14 rounded-full bg-[#FF6B00] items-center justify-center shadow-lg shadow-orange-500/50">
              <Ionicons name="videocam" size={26} color="#fff" />
            </View>
          );
        }
        const [on, off] = ICONS[route.name];
        return <Ionicons name={focused ? on : off} size={size} color={color} />;
      },
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Ana Sayfa' }} />
    <Tab.Screen name="Discover" component={DiscoverScreen} options={{ title: 'Keşfet' }} />
    <Tab.Screen name="Live" component={SellScreen} options={{ title: 'Yayın' }} />
    <Tab.Screen name="Activities" component={ActivitiesScreen} options={{ title: 'Aktivite' }} />
    <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profil' }} />
  </Tab.Navigator>
);
