import React from 'react';
import RNMapView, { Marker as RNMarker, MapViewProps, MapMarkerProps } from 'react-native-maps';

export const isMapsAvailable = true;

export const MapView = ({ style, children, ...props }: Partial<MapViewProps> & { style?: any; children?: React.ReactNode }) => {
  return (
    <RNMapView style={style} {...props}>
      {children}
    </RNMapView>
  );
};

export const Marker = (props: MapMarkerProps) => {
  return <RNMarker {...props} />;
};
