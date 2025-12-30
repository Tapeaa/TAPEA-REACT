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
            onPress={() => router.push('/(client)/profil')}
          >
            <Ionicons name="menu" size={20} color="#343434" />
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
    paddingVertical: 8,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 223, 109, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  logo: {
    height: 75,
    width: 150,
  },
  supportButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ff6b6b',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  categoriesContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 8,
  },
  categoriesScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryBubbleDefault: {
    backgroundColor: 'rgba(0, 0, 0, 0.40)',
  },
  categoryBubbleSelected: {
    backgroundColor: '#ffdf6d',
  },
  categoryIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryLabelDefault: {
    color: '#ffffff',
  },
  categoryLabelSelected: {
    color: '#5c5c5c',
  },
  scrollIndicatorContainer: {
    position: 'relative',
    height: 4,
    marginHorizontal: 48,
    marginTop: 8,
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
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
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
    backgroundColor: '#f6f6f6',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchPlaceholder: {
    flex: 1,
    color: '#8c8c8c',
    fontSize: 14,
    fontWeight: '500',
  },
  mapPickerButton: {
    width: 48,
    height: 48,
    backgroundColor: '#ffdf6d',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
});
