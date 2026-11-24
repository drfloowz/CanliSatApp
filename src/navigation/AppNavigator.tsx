import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/useAuthStore';
import { TabNavigator } from './TabNavigator';
import { LoginScreen } from '../screens/Auth/LoginScreen';
import { RegisterScreen } from '../screens/Auth/RegisterScreen';
import { LiveRoomScreen } from '../screens/live/LiveRoomScreen';
import { ProductDetailScreen } from '../screens/main/ProductDetailScreen';
import { SellerProfileScreen } from '../screens/main/SellerProfileScreen';
import { StreamFormScreen } from '../screens/sell/StreamFormScreen';
import { ProductFormScreen } from '../screens/sell/ProductFormScreen';
import { MyProductsScreen } from '../screens/sell/MyProductsScreen';
import { SellerOrdersScreen } from '../screens/sell/SellerOrdersScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { AddressesScreen, AddressFormScreen } from '../screens/profile/AddressesScreen';
import { NotificationsScreen } from '../screens/profile/NotificationsScreen';
import { AdminScreen } from '../screens/profile/AdminScreen';
import { LegalScreen } from '../screens/profile/LegalScreen';
import { InboxScreen } from '../screens/messages/InboxScreen';
import { ChatScreen } from '../screens/messages/ChatScreen';
import { Loading } from '../components/ui';

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
  const ready = useAuthStore((s) => s.ready);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!ready) return <Loading />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0E0E0E' } }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen name="LiveRoom" component={LiveRoomScreen} options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
          <Stack.Screen name="SellerProfile" component={SellerProfileScreen} />
          <Stack.Screen name="StreamForm" component={StreamFormScreen} />
          <Stack.Screen name="ProductForm" component={ProductFormScreen} />
          <Stack.Screen name="MyProducts" component={MyProductsScreen} />
          <Stack.Screen name="SellerOrders" component={SellerOrdersScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="Addresses" component={AddressesScreen} />
          <Stack.Screen name="AddressForm" component={AddressFormScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Admin" component={AdminScreen} />
          <Stack.Screen name="Legal" component={LegalScreen} />
          <Stack.Screen name="Inbox" component={InboxScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};
