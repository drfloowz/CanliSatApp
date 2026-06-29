import './global.css';
import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import { useColorScheme as useTailwindColorScheme } from 'nativewind';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useThemeStore } from './src/store/useThemeStore';

export default function App() {
  const systemTheme = useColorScheme();
  const { setColorScheme } = useTailwindColorScheme();
  const themeMode = useThemeStore((state) => state.themeMode);

  useEffect(() => {
    setColorScheme(themeMode);
  }, [themeMode, setColorScheme]);

  const isDark = themeMode === 'system' ? systemTheme === 'dark' : themeMode === 'dark';

  return (
    <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
      <RootNavigator />
    </NavigationContainer>
  );
}
