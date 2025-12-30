import { useState, useRef, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/lib/AuthContext';
import { MapView, Marker, isMapsAvailable } from '@/lib/maps';

const { width, height } = Dimensions.get('window');

const categories = [
  { id: 'tarifs', label: 'Tarifs', icon: require('@/assets/images/icon-tarifs.png'), href: '/(client)/tarifs' },
  { id: 'commandes', label: 'Commandes', icon: require('@/assets/images/icon-commandes.png'), href: '/(client)/commandes' },
  { id: 'paiement', label: 'Paiement', icon: require('@/assets/images/icon-paiement.png'), href: '/(client)/wallet' },
  { id: 'documents', label: 'Documents', icon: require('@/assets/images/icon-documents.png'), href: '/(client)/profil' },
  { id: 'contact', label: 'Contact', icon: require('@/assets/images/icon-contact.png'), href: '/(client)/support' },
];

const TAHITI_REGION = {
  latitude: -17.5516,
  longitude: -149.5585,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

export default function ClientHomeScreen() {
  const router = useRouter();
  const { client } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const mapRef = useRef<any>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      (async () => {
        try {
          const Location = require('expo-location');
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const location = await Location.getCurrentPositionAsync({});
            setUserLocation({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });
          }
        } catch (e) {
          console.log('Location not available');
        }
      })();
    }
  }, []);

  const handleCategoryPress = (category: typeof categories[0]) => {
    setSelectedCategory(category.id);
    router.push(category.href as any);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const maxScroll = contentSize.width - layoutMeasurement.width;
    const progress = maxScroll > 0 ? contentOffset.x / maxScroll : 0;
    setScrollProgress(progress);
  };

  const handleSearchPress = () => {
    router.push({
      pathname: '/(client)/commande-options',
      params: { type: 'immediate' },
    });
  };

  const handleRecenter = () => {
    if (mapRef.current && userLocation) {
      mapRef.current.animateToRegion({
        ...userLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  const renderMap = () => {
    if (MapView && Platform.OS !== 'web') {
      return (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={userLocation ? {
            ...userLocation,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          } : TAHITI_REGION}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {userLocation && Marker && (
            <Marker
              coordinate={userLocation}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.userMarker}>
                <View style={styles.userMarkerInner} />
              </View>
            </Marker>
          )}
        </MapView>
      );
    }

    return (
      <View style={styles.mapPlaceholder}>
        <Ionicons name="map-outline" size={64} color="#a3ccff" />
        <Text style={styles.mapPlaceholderText}>
          {Platform.OS === 'web' 
            ? 'Carte disponible sur mobile' 
            : 'Créez un Development Build pour activer la carte'}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Map Background */}
      <View style={styles.mapBackground}>
        {renderMap()}
      </View>

      {/* Header */}
      <SafeAreaView style={styles.header} edges={['top']}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={handleRecenter}
          >
            <Ionicons name="locate" size={20} color="#343434" />
          </TouchableOpacity>

          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          <TouchableOpacity
            style={styles.supportButton}
            onPress={() => router.push('/(client)/support')}
          >
            <Ionicons name="chatbubble" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Category Bubbles */}
      <View style={styles.categoriesContainer}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {categories.map((category) => {
            const isSelected = selectedCategory === category.id;
            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryBubble,
                  isSelected ? styles.categoryBubbleSelected : styles.categoryBubbleDefault
                ]}
                onPress={() => handleCategoryPress(category)}
              >
                <Image
                  source={category.icon}
                  style={styles.categoryIcon}
                  resizeMode="contain"
                />
                <Text
                  style={[
                    styles.categoryLabel,
                    isSelected ? styles.categoryLabelSelected : styles.categoryLabelDefault
                  ]}
                >
                  {category.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.scrollIndicatorContainer}>
          <View style={styles.scrollIndicatorTrack} />
          <View 
            style={[
              styles.scrollIndicatorThumb,
              { left: `${scrollProgress * 70}%` }
            ]} 
          />
        </View>
      </View>

      {/* Bottom Panel */}
      <View style={styles.bottomPanel}>
        <View style={styles.bottomPanelContent}>
          <View style={styles.searchRow}>
            <TouchableOpacity 
              style={styles.searchInputContainer}
              onPress={handleSearchPress}
            >
              <Ionicons name="search" size={20} color="#5c5c5c" />
              <Text style={styles.searchPlaceholder}>Où allez-vous ?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mapPickerButton}
              onPress={handleSearchPress}
            >
              <Ionicons name="map" size={20} color="#5c5c5c" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mapBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#e8f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  mapPlaceholderText: {
    marginTop: 16,
    fontSize: 14,
    color: '#5c5c5c',
    textAlign: 'center',
  },
  userMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 223, 109, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMarkerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F5C400',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  logo: {
    height: 54,
    width: 110,
    marginTop: 0,
  },
  supportButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#ff6b6b',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ff6b6b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  categoriesContainer: {
    position: 'absolute',
    top: 130,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  categoryBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    marginRight: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  categoryBubbleDefault: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  categoryBubbleSelected: {
    backgroundColor: '#F5C400',
    shadowColor: '#F5C400',
    shadowOpacity: 0.3,
  },
  categoryIcon: {
    width: 22,
    height: 22,
    marginRight: 10,
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  categoryLabelDefault: {
    color: '#343434',
  },
  categoryLabelSelected: {
    color: '#FFFFFF',
  },
  scrollIndicatorContainer: {
    display: 'none',
  },
  scrollIndicatorTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
  },
  scrollIndicatorThumb: {
    position: 'absolute',
    top: 0,
    width: '30%',
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 2,
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  bottomPanelContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 20,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  searchPlaceholder: {
    flex: 1,
    color: '#adb5bd',
    fontSize: 16,
    fontWeight: '500',
  },
  mapPickerButton: {
    width: 52,
    height: 52,
    backgroundColor: '#F5C400',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F5C400',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});
