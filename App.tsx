import './global.css';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: '#0E0E0E', card: '#121212', primary: '#FF6B00', border: '#232323' },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={theme}>
        <StatusBar style="light" />
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
