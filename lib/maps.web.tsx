import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

export const MapView = ({ style, children }: { style?: any; children?: React.ReactNode }) => (
  <View style={[style, styles.placeholder]}>
    <Text style={styles.text}>Carte non disponible sur le web</Text>
    {children}
  </View>
);

export const Marker = () => null;
export const isMapsAvailable = false;

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#6b7280',
    fontSize: 14,
  },
});
