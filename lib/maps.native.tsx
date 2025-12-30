import React from 'react';
import { View } from 'react-native';

let MapViewComponent: any = null;
let MarkerComponent: any = null;
let mapsAvailable = false;

try {
  const Maps = require('react-native-maps');
  MapViewComponent = Maps.default;
  MarkerComponent = Maps.Marker;
  mapsAvailable = true;
} catch (e) {
  console.log('Maps not available - requires development build');
}

export const MapView = MapViewComponent || (({ style, children }: { style?: any; children?: React.ReactNode }) => (
  <View style={style}>{children}</View>
));
export const Marker = MarkerComponent || (() => null);
export const isMapsAvailable = mapsAvailable;
