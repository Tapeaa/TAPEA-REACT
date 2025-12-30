import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

export const MapView = ({ style, children }: { style?: any; children?: React.ReactNode }) => (
  <View style={[style, { backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' }]}>
    <Text style={{ color: '#6b7280', fontSize: 14 }}>Carte non disponible</Text>
    {children}
  </View>
);

export const Marker = () => null;
export const isMapsAvailable = false;
