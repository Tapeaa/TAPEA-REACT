import React from 'react';
import { View } from 'react-native';

let CardFieldComponent: any = null;
let useConfirmSetupIntentHook: any = null;
let useStripeHook: any = null;
let StripeProviderComponent: any = null;
let stripeAvailable = false;

try {
  const StripeNative = require('@stripe/stripe-react-native');
  CardFieldComponent = StripeNative.CardField;
  useConfirmSetupIntentHook = StripeNative.useConfirmSetupIntent;
  useStripeHook = StripeNative.useStripe;
  StripeProviderComponent = StripeNative.StripeProvider;
  stripeAvailable = true;
} catch (e) {
  console.log('Stripe not available - requires development build');
}

export const CardField = CardFieldComponent;
export const useConfirmSetupIntent = useConfirmSetupIntentHook || (() => null);
export const useStripe = useStripeHook || (() => null);
export const StripeProvider = StripeProviderComponent || (({ children }: { children: React.ReactNode }) => (
  <View style={{ flex: 1 }}>{children}</View>
));
export const isStripeAvailable = stripeAvailable;
