import { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Keyboard,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || '';

type PlacePrediction = {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
};

type LocationPoint = {
  id: string;
  type: 'pickup' | 'stop' | 'destination';
  address: string;
  placeId: string | null;
  coordinates: { lat: number; lng: number } | null;
};

export default function ItineraryScreen() {
  const router = useRouter();
  const [locations, setLocations] = useState<LocationPoint[]>([
    { id: 'pickup', type: 'pickup', address: '', placeId: null, coordinates: null },
    { id: 'destination', type: 'destination', address: '', placeId: null, coordinates: null },
  ]);
  const [activeInputId, setActiveInputId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPlacePredictions = async (input: string) => {
    if (!input || input.length < 3 || !API_URL) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/places/autocomplete?input=${encodeURIComponent(input)}`
      );
      if (!response.ok) {
        setSuggestions([]);
        return;
      }
      const data = await response.json();
      if (data.predictions) {
        setSuggestions(data.predictions);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlaceDetails = async (placeId: string) => {
    if (!API_URL) return null;
    try {
      const response = await fetch(
        `${API_URL}/places/details?place_id=${placeId}`
      );
      if (!response.ok) return null;
      const data = await response.json();
      if (data.location) {
        return {
          lat: data.location.lat,
          lng: data.location.lng,
        };
      }
    } catch (error) {
    }
    return null;
  };

  const handleAddressChange = (id: string, text: string) => {
    setLocations((prev) =>
      prev.map((loc) =>
        loc.id === id ? { ...loc, address: text, placeId: null, coordinates: null } : loc
      )
    );

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      fetchPlacePredictions(text);
    }, 300);
  };

  const handleSelectSuggestion = async (prediction: PlacePrediction) => {
    if (!activeInputId) return;

    const coordinates = await fetchPlaceDetails(prediction.place_id);

    setLocations((prev) =>
      prev.map((loc) =>
        loc.id === activeInputId
          ? {
              ...loc,
              address: prediction.description,
              placeId: prediction.place_id,
              coordinates,
            }
          : loc
      )
    );

    setSuggestions([]);
    setActiveInputId(null);
    Keyboard.dismiss();
  };

  const handleAddStop = () => {
    const stopCount = locations.filter((l) => l.type === 'stop').length;
    if (stopCount >= 3) return;

    const newStop: LocationPoint = {
      id: `stop-${Date.now()}`,
      type: 'stop',
      address: '',
      placeId: null,
      coordinates: null,
    };

    setLocations((prev) => {
      const destinationIndex = prev.findIndex((l) => l.type === 'destination');
      const newLocations = [...prev];
      newLocations.splice(destinationIndex, 0, newStop);
      return newLocations;
    });
  };

  const handleRemoveStop = (id: string) => {
    setLocations((prev) => prev.filter((loc) => loc.id !== id));
  };

  const handleConfirm = () => {
    const pickup = locations.find((l) => l.type === 'pickup');
    const destination = locations.find((l) => l.type === 'destination');
    const stops = locations.filter((l) => l.type === 'stop');

    if (!pickup?.address || !destination?.address) {
      alert('Veuillez renseigner les adresses de départ et d\'arrivée');
      return;
    }

    router.push({
      pathname: '/(client)/commande-options',
      params: {
        type: 'immediate',
        pickup: pickup.address,
        pickupPlaceId: pickup.placeId || '',
        destination: destination.address,
        destinationPlaceId: destination.placeId || '',
        stops: JSON.stringify(stops.map((s) => ({ address: s.address, placeId: s.placeId }))),
      },
    });
  };

  const getPlaceholder = (type: LocationPoint['type']) => {
    switch (type) {
      case 'pickup':
        return 'Adresse de départ';
      case 'destination':
        return 'Où allez-vous ?';
      case 'stop':
        return 'Ajouter un arrêt';
    }
  };

  const getDotColor = (type: LocationPoint['type']) => {
    switch (type) {
      case 'pickup':
        return '#22C55E';
      case 'destination':
        return '#EF4444';
      case 'stop':
        return '#F5C400';
    }
  };

  const canAddMoreStops = locations.filter((l) => l.type === 'stop').length < 3;
  const isValid =
    locations.find((l) => l.type === 'pickup')?.address &&
    locations.find((l) => l.type === 'destination')?.address;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text variant="h2">Itinéraire</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content} 
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.locationsContainer}>
          <View style={styles.timeline}>
            {locations.map((loc, index) => (
              <View key={loc.id} style={styles.timelineItem}>
                <View
                  style={[
                    styles.timelineDot,
                    { backgroundColor: getDotColor(loc.type) },
                  ]}
                />
                {index < locations.length - 1 && <View style={styles.timelineLine} />}
              </View>
            ))}
          </View>

          <View style={styles.inputsContainer}>
            {locations.map((loc) => (
              <View key={loc.id} style={styles.inputRow}>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.addressInput}
                    placeholder={getPlaceholder(loc.type)}
                    placeholderTextColor="#9CA3AF"
                    value={loc.address}
                    onChangeText={(text) => handleAddressChange(loc.id, text)}
                    onFocus={() => setActiveInputId(loc.id)}
                  />
                  {loc.type === 'stop' && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveStop(loc.id)}
                    >
                      <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}

            {canAddMoreStops && (
              <TouchableOpacity style={styles.addStopButton} onPress={handleAddStop}>
                <Ionicons name="add-circle-outline" size={20} color="#F5C400" />
                <Text style={styles.addStopText}>Ajouter un arrêt</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {activeInputId && (suggestions.length > 0 || isLoading) && (
          <View style={styles.suggestionsContainer}>
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#F5C400" />
              </View>
            )}
            {suggestions.map((item) => (
              <TouchableOpacity
                key={item.place_id}
                style={styles.suggestionItem}
                onPress={() => handleSelectSuggestion(item)}
              >
                <Ionicons name="location-outline" size={20} color="#6B7280" />
                <View style={styles.suggestionText}>
                  <Text style={styles.suggestionMain}>
                    {item.structured_formatting?.main_text || item.description}
                  </Text>
                  {item.structured_formatting?.secondary_text && (
                    <Text style={styles.suggestionSecondary}>
                      {item.structured_formatting.secondary_text}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmButton, !isValid && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={!isValid}
        >
          <Text style={styles.confirmButtonText}>Confirmer l'itinéraire</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  locationsContainer: {
    flexDirection: 'row',
  },
  timeline: {
    width: 24,
    alignItems: 'center',
    paddingTop: 18,
  },
  timelineItem: {
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  timelineLine: {
    width: 2,
    height: 52,
    backgroundColor: '#E5E7EB',
  },
  inputsContainer: {
    flex: 1,
    gap: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
  },
  addressInput: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: '#1A1A1A',
  },
  removeButton: {
    padding: 4,
  },
  addStopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  addStopText: {
    fontSize: 14,
    color: '#F5C400',
    fontWeight: '600',
  },
  suggestionsContainer: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionText: {
    flex: 1,
  },
  suggestionMain: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  suggestionSecondary: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  confirmButton: {
    backgroundColor: '#F5C400',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
});
