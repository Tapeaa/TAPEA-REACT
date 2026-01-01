import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RIDE_OPTIONS, SUPPLEMENTS, calculatePrice, type Supplement, type RouteInfo, type PaymentMethod } from '@/lib/types';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import Constants from 'expo-constants';
import DateTimePicker from '@react-native-community/datetimepicker';

const getPlacesApiUrl = (): string => {
  const domain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS;
  if (domain) {
    return `https://${domain}/api`;
  }
  return Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || '';
};

const PLACES_API_URL = getPlacesApiUrl();

export default function CommandeOptionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    type: string;
    pickup?: string;
    pickupPlaceId?: string;
    pickupLat?: string;
    pickupLng?: string;
    destination?: string;
    destinationPlaceId?: string;
    destinationLat?: string;
    destinationLng?: string;
    stops?: string;
  }>();
  const selectedOption = RIDE_OPTIONS.find((o) => o.id === params.type) || RIDE_OPTIONS[0];

  const { client } = useAuth();
  const [pickup, setPickup] = useState(params.pickup || '');
  const [destination, setDestination] = useState(params.destination || '');
  const [passengers, setPassengers] = useState(1);
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [isAdvanceBooking, setIsAdvanceBooking] = useState(false);
  const [scheduledTime, setScheduledTime] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [distance, setDistance] = useState<number>(5); // Distance par défaut
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const routeCalculationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Récupérer les cartes bancaires
  const { data: paymentMethods = [] } = useQuery<PaymentMethod[]>({
    queryKey: ['payment-methods', client?.id],
    queryFn: () => apiFetch<PaymentMethod[]>(`/api/stripe/payment-methods/${client?.id}`),
    enabled: !!client?.id && paymentMethod === 'card',
  });

  // Sélectionner la carte par défaut si disponible
  useEffect(() => {
    if (paymentMethods.length > 0 && !selectedCardId) {
      const defaultCard = paymentMethods.find(m => m.isDefault) || paymentMethods[0];
      setSelectedCardId(defaultCard.id);
    }
  }, [paymentMethods, selectedCardId]);

  // Réinitialiser la carte si on passe en espèces
  useEffect(() => {
    if (paymentMethod === 'cash') {
      setSelectedCardId(null);
    } else if (paymentMethod === 'card' && paymentMethods.length === 0) {
      Alert.alert(
        'Aucune carte',
        'Vous devez ajouter une carte bancaire pour payer par carte. Voulez-vous aller à la page de gestion des cartes ?',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Oui', onPress: () => router.push('/(client)/cartes-bancaires') },
        ]
      );
      setPaymentMethod('cash');
    }
  }, [paymentMethod, paymentMethods.length]);

  // Calculer la route quand les adresses sont disponibles
  useEffect(() => {
    // Nettoyer le timeout précédent
    if (routeCalculationTimeoutRef.current) {
      clearTimeout(routeCalculationTimeoutRef.current);
    }

    // Attendre un peu avant de calculer (debounce)
    routeCalculationTimeoutRef.current = setTimeout(async () => {
      const pickupPlaceId = params.pickupPlaceId;
      const destinationPlaceId = params.destinationPlaceId;
      const pickupLat = params.pickupLat;
      const pickupLng = params.pickupLng;
      const destinationLat = params.destinationLat;
      const destinationLng = params.destinationLng;

      // Si on a les placeIds ou les coordonnées, calculer la route
      if ((pickupPlaceId && destinationPlaceId) || (pickupLat && pickupLng && destinationLat && destinationLng)) {
        setIsCalculatingRoute(true);
        try {
          let origin: string;
          let destinationParam: string;

          // Préférer placeId si disponible, sinon utiliser coordonnées
          if (pickupPlaceId && destinationPlaceId) {
            origin = `place_id:${pickupPlaceId}`;
            destinationParam = `place_id:${destinationPlaceId}`;
          } else if (pickupLat && pickupLng && destinationLat && destinationLng) {
            origin = `${pickupLat},${pickupLng}`;
            destinationParam = `${destinationLat},${destinationLng}`;
          } else {
            return; // Pas assez d'infos
          }

          // Récupérer les waypoints (stops) si présents
          let waypoints: string[] = [];
          if (params.stops) {
            try {
              const stops = JSON.parse(params.stops) as Array<{ placeId?: string; lat?: number; lng?: number }>;
              waypoints = stops
                .filter(s => s.placeId || (s.lat && s.lng))
                .map(s => s.placeId || `${s.lat},${s.lng}`)
                .filter((w): w is string => !!w);
            } catch (e) {
              console.warn('Failed to parse stops for route calculation:', e);
            }
          }

          const waypointsParam = waypoints.length > 0 ? JSON.stringify(waypoints) : undefined;

          const url = new URL(`${PLACES_API_URL}/places/directions`);
          url.searchParams.set('origin', origin);
          url.searchParams.set('destination', destinationParam);
          if (waypointsParam) {
            url.searchParams.set('waypoints', waypointsParam);
          }
          url.searchParams.set('travelMode', 'driving');

          const response = await fetch(url.toString());
          if (!response.ok) {
            throw new Error('Erreur lors du calcul de la route');
          }

          const data = await response.json();
          if (data.distance && data.duration) {
            setDistance(data.distance);
            setRouteInfo({
              distance: data.distance,
              duration: data.duration,
            });
          }
        } catch (error) {
          console.error('Error calculating route:', error);
          // En cas d'erreur, garder la distance par défaut
        } finally {
          setIsCalculatingRoute(false);
        }
      }
    }, 500); // Debounce de 500ms

    return () => {
      if (routeCalculationTimeoutRef.current) {
        clearTimeout(routeCalculationTimeoutRef.current);
      }
    };
  }, [params.pickupPlaceId, params.destinationPlaceId, params.pickupLat, params.pickupLng, params.destinationLat, params.destinationLng, params.stops]);

  const { totalPrice, driverEarnings } = calculatePrice(
    selectedOption,
    distance,
    supplements
  );

  const formatPrice = (price: number) => `${price.toLocaleString('fr-FR')} XPF`;

  const handleSupplementToggle = (supplementId: string) => {
    const existing = supplements.find((s) => s.id === supplementId);
    if (existing) {
      if (existing.quantity > 1) {
        setSupplements(
          supplements.map((s) =>
            s.id === supplementId ? { ...s, quantity: s.quantity - 1 } : s
          )
        );
      } else {
        setSupplements(supplements.filter((s) => s.id !== supplementId));
      }
    } else {
      const supp = SUPPLEMENTS.find((s) => s.id === supplementId);
      if (supp) {
        setSupplements([...supplements, { ...supp, quantity: 1 }]);
      }
    }
  };

  const handleAddSupplement = (supplementId: string) => {
    const existing = supplements.find((s) => s.id === supplementId);
    if (existing) {
      setSupplements(
        supplements.map((s) =>
          s.id === supplementId ? { ...s, quantity: s.quantity + 1 } : s
        )
      );
    } else {
      const supp = SUPPLEMENTS.find((s) => s.id === supplementId);
      if (supp) {
        setSupplements([...supplements, { ...supp, quantity: 1 }]);
      }
    }
  };

  const handleOrder = () => {
    if (!pickup || !destination) {
      Alert.alert('Erreur', 'Veuillez renseigner les adresses de départ et d\'arrivée.');
      return;
    }

    if (paymentMethod === 'card' && !selectedCardId) {
      Alert.alert('Erreur', 'Veuillez sélectionner une carte bancaire.');
      setShowCardModal(true);
      return;
    }

    if (isAdvanceBooking && scheduledTime <= new Date()) {
      Alert.alert('Erreur', 'La date et l\'heure de réservation doivent être dans le futur.');
      return;
    }

    // Utiliser routeInfo calculé ou une estimation par défaut
    const finalRouteInfo: RouteInfo = routeInfo || {
      distance: distance,
      duration: `${Math.round(distance * 2)} min`,
    };
    
    // Navigate to order confirmation/search driver screen
    router.push({
      pathname: '/(client)/ride/recherche-chauffeur',
      params: {
        type: params.type || 'immediate',
        pickup,
        pickupPlaceId: params.pickupPlaceId || '',
        pickupLat: params.pickupLat || '',
        pickupLng: params.pickupLng || '',
        destination,
        destinationPlaceId: params.destinationPlaceId || '',
        destinationLat: params.destinationLat || '',
        destinationLng: params.destinationLng || '',
        stops: params.stops || JSON.stringify([]),
        passengers: passengers.toString(),
        supplements: JSON.stringify(supplements),
        paymentMethod,
        selectedCardId: selectedCardId || '',
        isAdvanceBooking: isAdvanceBooking.toString(),
        scheduledTime: isAdvanceBooking ? scheduledTime.toISOString() : '',
        totalPrice: totalPrice.toString(),
        driverEarnings: driverEarnings.toString(),
        routeInfo: JSON.stringify(finalRouteInfo),
      },
    });
  };

  const formatDateTime = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} à ${hours}:${minutes}`;
  };

  const getCardIcon = (brand: string) => {
    switch (brand.toLowerCase()) {
      case 'visa':
        return 'card';
      case 'mastercard':
        return 'card';
      case 'amex':
        return 'card';
      default:
        return 'card-outline';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text variant="h2">{selectedOption.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.section}>
          <Text variant="label" style={styles.sectionTitle}>
            Adresses
          </Text>
          <View style={styles.addressInputs}>
            <View style={styles.addressRow}>
              <View style={[styles.dot, { backgroundColor: '#22C55E' }]} />
              <Input
                placeholder="Adresse de départ"
                value={pickup}
                onChangeText={setPickup}
                style={styles.addressInput}
              />
            </View>
            <View style={styles.addressRow}>
              <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
              <Input
                placeholder="Adresse d'arrivée"
                value={destination}
                onChangeText={setDestination}
                style={styles.addressInput}
              />
            </View>
          </View>
        </Card>

        <Card style={styles.section}>
          <Text variant="label" style={styles.sectionTitle}>
            Passagers
          </Text>
          <View style={styles.passengerSelector}>
            <TouchableOpacity
              style={styles.passengerButton}
              onPress={() => setPassengers(Math.max(1, passengers - 1))}
            >
              <Ionicons name="remove" size={24} color="#1a1a1a" />
            </TouchableOpacity>
            <Text variant="h2">{passengers}</Text>
            <TouchableOpacity
              style={styles.passengerButton}
              onPress={() => setPassengers(Math.min(8, passengers + 1))}
            >
              <Ionicons name="add" size={24} color="#1a1a1a" />
            </TouchableOpacity>
          </View>
        </Card>

        <Card style={styles.section}>
          <Text variant="label" style={styles.sectionTitle}>
            Suppléments
          </Text>
          <View style={styles.supplementsList}>
            {SUPPLEMENTS.map((supp) => {
              const added = supplements.find((s) => s.id === supp.id);
              return (
                <View key={supp.id} style={styles.supplementRow}>
                  <View style={styles.supplementInfo}>
                    <Ionicons
                      name={supp.id === 'bagages' ? 'briefcase' : 'cube'}
                      size={24}
                      color="#6b7280"
                    />
                    <View>
                      <Text variant="body">{supp.name}</Text>
                      <Text variant="caption">{formatPrice(supp.price)} / unité</Text>
                    </View>
                  </View>
                  <View style={styles.supplementControls}>
                    {added && (
                      <TouchableOpacity
                        style={styles.supplementButton}
                        onPress={() => handleSupplementToggle(supp.id)}
                      >
                        <Ionicons name="remove" size={20} color="#1a1a1a" />
                      </TouchableOpacity>
                    )}
                    <Text variant="label">{added?.quantity || 0}</Text>
                    <TouchableOpacity
                      style={styles.supplementButton}
                      onPress={() => handleAddSupplement(supp.id)}
                    >
                      <Ionicons name="add" size={20} color="#1a1a1a" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </Card>

        <Card style={styles.section}>
          <Text variant="label" style={styles.sectionTitle}>
            Paiement
          </Text>
          <View style={styles.paymentOptions}>
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'cash' && styles.paymentOptionSelected,
              ]}
              onPress={() => setPaymentMethod('cash')}
            >
              <Ionicons
                name="cash"
                size={24}
                color={paymentMethod === 'cash' ? '#F5C400' : '#6b7280'}
              />
              <Text variant="body">Espèces</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'card' && styles.paymentOptionSelected,
              ]}
              onPress={() => {
                if (paymentMethods.length === 0) {
                  Alert.alert(
                    'Aucune carte',
                    'Vous devez ajouter une carte bancaire pour payer par carte.',
                    [
                      { text: 'Annuler', style: 'cancel' },
                      { text: 'Ajouter une carte', onPress: () => router.push('/(client)/cartes-bancaires') },
                    ]
                  );
                } else {
                  setPaymentMethod('card');
                  setShowCardModal(true);
                }
              }}
            >
              <Ionicons
                name="card"
                size={24}
                color={paymentMethod === 'card' ? '#F5C400' : '#6b7280'}
              />
              <Text variant="body">Carte</Text>
            </TouchableOpacity>
          </View>
          {paymentMethod === 'card' && selectedCardId && (
            <TouchableOpacity
              style={styles.selectedCard}
              onPress={() => setShowCardModal(true)}
            >
              <Ionicons
                name={getCardIcon(paymentMethods.find(c => c.id === selectedCardId)?.brand || '')}
                size={20}
                color="#1a1a1a"
              />
              <Text variant="body" style={styles.selectedCardText}>
                {paymentMethods.find(c => c.id === selectedCardId)?.brand.toUpperCase()} •••• {paymentMethods.find(c => c.id === selectedCardId)?.last4}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </Card>

        <Card style={styles.section}>
          <View style={styles.reservationHeader}>
            <Text variant="label" style={styles.sectionTitle}>
              Réservation
            </Text>
            <TouchableOpacity
              style={styles.toggle}
              onPress={() => setIsAdvanceBooking(!isAdvanceBooking)}
            >
              <View style={[styles.toggleTrack, isAdvanceBooking && styles.toggleTrackActive]}>
                <View style={[styles.toggleThumb, isAdvanceBooking && styles.toggleThumbActive]} />
              </View>
            </TouchableOpacity>
          </View>
          {isAdvanceBooking && (
            <View style={styles.reservationContent}>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar" size={20} color="#1a1a1a" />
                <Text variant="body">{formatDateTime(scheduledTime)}</Text>
                <Ionicons name="chevron-forward" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
          )}
        </Card>

        <Card style={styles.priceCard}>
          <View style={styles.priceRow}>
            <Text variant="body">Prix de base</Text>
            <Text variant="body">{formatPrice(selectedOption.basePrice)}</Text>
          </View>
          <View style={styles.priceRow}>
            <View style={styles.distanceRow}>
              <Text variant="body">
                Distance {isCalculatingRoute ? '(calcul...)' : `(${distance.toFixed(1)} km)`}
              </Text>
              {isCalculatingRoute && (
                <ActivityIndicator size="small" color="#F5C400" style={styles.loadingIndicator} />
              )}
            </View>
            <Text variant="body">
              {formatPrice(distance * selectedOption.pricePerKm)}
            </Text>
          </View>
          {supplements.length > 0 && (
            <View style={styles.priceRow}>
              <Text variant="body">Suppléments</Text>
              <Text variant="body">
                {formatPrice(
                  supplements.reduce((sum, s) => sum + s.price * s.quantity, 0)
                )}
              </Text>
            </View>
          )}
          <View style={[styles.priceRow, styles.totalRow]}>
            <Text variant="h3">Total</Text>
            <Text variant="h2" style={styles.totalPrice}>
              {formatPrice(totalPrice)}
            </Text>
          </View>
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Commander" onPress={handleOrder} fullWidth />
      </View>

      {/* Modal de sélection de carte */}
      <Modal
        visible={showCardModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCardModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text variant="h2">Sélectionner une carte</Text>
              <TouchableOpacity onPress={() => setShowCardModal(false)}>
                <Ionicons name="close" size={24} color="#1a1a1a" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {paymentMethods.map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={[
                    styles.cardOption,
                    selectedCardId === card.id && styles.cardOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedCardId(card.id);
                    setShowCardModal(false);
                  }}
                >
                  <Ionicons
                    name={getCardIcon(card.brand)}
                    size={24}
                    color={selectedCardId === card.id ? '#F5C400' : '#6b7280'}
                  />
                  <View style={styles.cardOptionInfo}>
                    <Text variant="body">
                      {card.brand.charAt(0).toUpperCase() + card.brand.slice(1)} •••• {card.last4}
                    </Text>
                    <Text variant="caption">
                      Expire {card.expiryMonth.toString().padStart(2, '0')}/{card.expiryYear}
                    </Text>
                  </View>
                  {card.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text variant="caption" style={styles.defaultBadgeText}>Par défaut</Text>
                    </View>
                  )}
                  {selectedCardId === card.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#F5C400" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button
              title="Ajouter une carte"
              onPress={() => {
                setShowCardModal(false);
                router.push('/(client)/cartes-bancaires');
              }}
              fullWidth
              style={styles.addCardButton}
            />
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && Platform.OS !== 'web' && (
        <DateTimePicker
          value={scheduledTime}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={new Date()}
          onChange={(event, selectedDate) => {
            setShowDatePicker(Platform.OS === 'android');
            if (selectedDate) {
              setScheduledTime(selectedDate);
              if (Platform.OS === 'android') {
                setShowTimePicker(true);
              }
            }
          }}
        />
      )}

      {/* Time Picker */}
      {showTimePicker && Platform.OS !== 'web' && (
        <DateTimePicker
          value={scheduledTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedTime) => {
            setShowTimePicker(Platform.OS === 'android');
            if (selectedTime) {
              setScheduledTime(selectedTime);
            }
          }}
        />
      )}

      {/* Web fallback pour date/time picker */}
      {Platform.OS === 'web' && (showDatePicker || showTimePicker) && (
        <Modal
          visible={showDatePicker || showTimePicker}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setShowDatePicker(false);
            setShowTimePicker(false);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text variant="h2">Sélectionner la date et l'heure</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowDatePicker(false);
                    setShowTimePicker(false);
                  }}
                >
                  <Ionicons name="close" size={24} color="#1a1a1a" />
                </TouchableOpacity>
              </View>
              <View style={styles.webDatePicker}>
                <Text variant="body" style={styles.webDatePickerLabel}>
                  Date et heure de réservation
                </Text>
                <Text variant="caption" style={styles.webDatePickerHint}>
                  Utilisez un appareil mobile pour une meilleure expérience
                </Text>
                <Input
                  placeholder="Date (JJ/MM/AAAA)"
                  value={scheduledTime.getDate().toString().padStart(2, '0') + '/' + (scheduledTime.getMonth() + 1).toString().padStart(2, '0') + '/' + scheduledTime.getFullYear()}
                  editable={false}
                  style={styles.webDateInput}
                />
                <Input
                  placeholder="Heure (HH:MM)"
                  value={scheduledTime.getHours().toString().padStart(2, '0') + ':' + scheduledTime.getMinutes().toString().padStart(2, '0')}
                  editable={false}
                  style={styles.webDateInput}
                />
                <Button
                  title="OK"
                  onPress={() => {
                    setShowDatePicker(false);
                    setShowTimePicker(false);
                  }}
                  fullWidth
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 100,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  addressInputs: {
    gap: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  addressInput: {
    flex: 1,
  },
  passengerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  passengerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  supplementsList: {
    gap: 16,
  },
  supplementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  supplementInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  supplementControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  supplementButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  paymentOptionSelected: {
    borderColor: '#F5C400',
    backgroundColor: '#FEF3C7',
  },
  priceCard: {
    padding: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 8,
    paddingTop: 16,
  },
  totalPrice: {
    color: '#F5C400',
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingIndicator: {
    marginLeft: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 32,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectedCardText: {
    flex: 1,
  },
  reservationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggle: {
    marginLeft: 'auto',
  },
  toggleTrack: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleTrackActive: {
    backgroundColor: '#F5C400',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  reservationContent: {
    marginTop: 16,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalScroll: {
    maxHeight: 400,
  },
  cardOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  cardOptionSelected: {
    backgroundColor: '#FEF3C7',
  },
  cardOptionInfo: {
    flex: 1,
  },
  defaultBadge: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  defaultBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
  },
  addCardButton: {
    margin: 20,
    marginTop: 12,
  },
  webDatePicker: {
    padding: 20,
    gap: 16,
  },
  webDatePickerLabel: {
    marginBottom: 8,
  },
  webDatePickerHint: {
    color: '#6b7280',
    marginBottom: 12,
  },
  webDateInput: {
    marginBottom: 12,
  },
});
