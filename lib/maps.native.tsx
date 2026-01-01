import React from 'react';
// Ce fichier ne devrait être chargé que sur les plateformes natives
// Si vous voyez cette erreur sur le web, c'est que le bundler charge ce fichier par erreur
// Utilisez maps.web.tsx ou maps.tsx à la place
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
