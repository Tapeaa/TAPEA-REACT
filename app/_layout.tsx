import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import { View } from 'react-native';

import { AuthProvider } from '@/lib/AuthContext';
import { queryClient } from '@/lib/queryClient';

// Mocking StripeProvider if native module is missing
const StripeProviderMock = ({ children }: { children: React.ReactNode }) => <View style={{ flex: 1 }}>{children}</View>;

let StripeProvider: any = StripeProviderMock;
try {
  const StripeNative = require('@stripe/stripe-react-native');
  if (StripeNative.StripeProvider) {
    StripeProvider = StripeNative.StripeProvider;
  }
} catch (e) {
  console.warn('Stripe native module not found, using mock');
}

SplashScreen.preventAutoHideAsync();

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
      <StripeProvider
        publishableKey="pk_test_mock"
        merchantIdentifier="merchant.com.tapea"
      >
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(client)" />
            <Stack.Screen name="(chauffeur)" />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="dark" />
        </AuthProvider>
      </StripeProvider>
    </QueryClientProvider>
  );
}
