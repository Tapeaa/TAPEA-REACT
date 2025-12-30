import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import { Platform, View } from 'react-native';
import Constants from 'expo-constants';

import { AuthProvider } from '@/lib/AuthContext';
import { queryClient } from '@/lib/queryClient';

SplashScreen.preventAutoHideAsync();

const stripePublishableKey = Constants.expoConfig?.extra?.stripePublishableKey || '';

let StripeProviderWrapper: React.FC<{ children: React.ReactNode }>;

if (Platform.OS === 'web') {
  StripeProviderWrapper = ({ children }) => <View style={{ flex: 1 }}>{children}</View>;
} else {
  try {
    const { StripeProvider } = require('@stripe/stripe-react-native');
    StripeProviderWrapper = ({ children }) => (
      <StripeProvider
        publishableKey={stripePublishableKey}
        merchantIdentifier="merchant.com.tapea"
      >
        {children}
      </StripeProvider>
    );
  } catch (e) {
    StripeProviderWrapper = ({ children }) => <View style={{ flex: 1 }}>{children}</View>;
  }
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StripeProviderWrapper>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(client)" />
            <Stack.Screen name="(chauffeur)" />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="dark" />
        </AuthProvider>
      </StripeProviderWrapper>
    </QueryClientProvider>
  );
}
