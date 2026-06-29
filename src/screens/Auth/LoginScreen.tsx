import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../store/useAuthStore';

export const LoginScreen = ({ navigation }: any) => {
  const login = useAuthStore((state) => state.login);

  return (
    <View className="flex-1 justify-center px-6 bg-white dark:bg-gray-900">
      <Text className="text-3xl font-bold text-black dark:text-white mb-8 text-center">
        Welcome Back
      </Text>

      <View className="mb-4">
        <Text className="text-gray-700 dark:text-gray-300 mb-2 font-medium">Email</Text>
        <TextInput 
          className="w-full bg-gray-100 dark:bg-gray-800 text-black dark:text-white px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700"
          placeholder="Enter your email"
          placeholderTextColor="#9ca3af"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View className="mb-6">
        <Text className="text-gray-700 dark:text-gray-300 mb-2 font-medium">Password</Text>
        <TextInput 
          className="w-full bg-gray-100 dark:bg-gray-800 text-black dark:text-white px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700"
          placeholder="Enter your password"
          placeholderTextColor="#9ca3af"
          secureTextEntry
        />
      </View>

      <TouchableOpacity 
        className="w-full bg-blue-600 py-4 rounded-xl items-center mb-4 shadow-sm"
        onPress={() => login()}
      >
        <Text className="text-white font-bold text-lg">Login</Text>
      </TouchableOpacity>

      <View className="flex-row justify-center mt-4">
        <Text className="text-gray-600 dark:text-gray-400">Don't have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text className="text-blue-600 dark:text-blue-400 font-bold">Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
