import './global.css';
import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import { useColorScheme as useTailwindColorScheme } from 'nativewind';
import { AppNavigator } from './src/navigation/AppNavigator';
import { useThemeStore } from './src/store/useThemeStore';
import { I18nextProvider } from 'react-i18next';
import i18n from './src/locales/i18n';

export default function App() {
  const systemTheme = useColorScheme();
  const { setColorScheme } = useTailwindColorScheme();
  const themeMode = useThemeStore((state) => state.themeMode);

  useEffect(() => {
    setColorScheme(themeMode);
  }, [themeMode, setColorScheme]);

  const isDark = themeMode === 'system' ? systemTheme === 'dark' : themeMode === 'dark';

  return (
    <I18nextProvider i18n={i18n}>
      <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
        <AppNavigator />
      </NavigationContainer>
    </I18nextProvider>
  );
}
