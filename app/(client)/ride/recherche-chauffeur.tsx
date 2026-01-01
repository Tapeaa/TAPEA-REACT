import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/AuthContext';
import { createOrder, setClientToken, setCurrentOrderId, removeClientToken, removeCurrentOrderId } from '@/lib/api';
import {
  connectSocketAsync,
  joinClientSession,
  onDriverAssigned,
  onOrderExpired,
  onClientJoinError,
  disconnectSocket,
} from '@/lib/socket';
import type { AddressField, Supplement } from '@/lib/types';

export default function RechercheChauffeureScreen() {
  const router = useRouter();
  const { client } = useAuth();
  const params = useLocalSearchParams<{
    type: string;
    pickup: string;
    pickupPlaceId?: string;
    pickupLat?: string;
    pickupLng?: string;
    destination: string;
    destinationPlaceId?: string;
    destinationLat?: string;
    destinationLng?: string;
    stops?: string;
    passengers: string;
    supplements?: string;
    totalPrice: string;
    driverEarnings: string;
    paymentMethod: string;
    selectedCardId?: string;
    routeInfo?: string;
    scheduledTime?: string;
    isAdvanceBooking?: string;
  }>();

  const [status, setStatus] = useState<'creating' | 'searching' | 'found' | 'expired' | 'error'>('creating');
  const [searchTime, setSearchTime] = useState(0);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [clientToken, setClientTokenState] = useState<string | null>(null);
  const [driverInfo, setDriverInfo] = useState<{
    name: string;
    driverId: string;
    sessionId: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const expirationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Créer la commande au chargement
  useEffect(() => {
    let mounted = true;

    const createOrderAndJoin = async () => {
      try {
        // Préparer les adresses (nettoyer pour ne pas envoyer undefined)
        const addresses: AddressField[] = [
          {
            id: 'pickup',
            value: params.pickup || '',
            placeId: params.pickupPlaceId || null,
            type: 'pickup',
            ...(params.pickupLat && params.pickupLng
              ? { lat: parseFloat(params.pickupLat), lng: parseFloat(params.pickupLng) }
              : {}),
          },
          {
            id: 'destination',
            value: params.destination || '',
            placeId: params.destinationPlaceId || null,
            type: 'destination',
            ...(params.destinationLat && params.destinationLng
              ? { lat: parseFloat(params.destinationLat), lng: parseFloat(params.destinationLng) }
              : {}),
          },
        ];

        // Ajouter les arrêts intermédiaires si présents
        if (params.stops) {
          try {
            const stops = JSON.parse(params.stops) as AddressField[];
            addresses.push(...stops);
          } catch (e) {
            console.warn('Failed to parse stops:', e);
          }
        }

        // Préparer les suppléments
        let supplements: Supplement[] = [];
        if (params.supplements) {
          try {
            supplements = JSON.parse(params.supplements);
          } catch (e) {
            console.warn('Failed to parse supplements:', e);
          }
        }

        // Préparer routeInfo
        let routeInfo = undefined;
        if (params.routeInfo) {
          try {
            routeInfo = JSON.parse(params.routeInfo);
          } catch (e) {
            console.warn('Failed to parse routeInfo:', e);
          }
        }

        // Préparer les données de commande
        const rideOptionId = params.type || 'immediate';
        const rideOptions = {
          immediate: { id: 'immediate', title: 'Taxi immédiat', price: 2300, pricePerKm: 150 },
          reservation: { id: 'reservation', title: 'Réservation à l\'avance', price: 2300, pricePerKm: 150 },
          tour: { id: 'tour', title: 'Tour de l\'Île', price: 30000, pricePerKm: 0 },
        };
        const selectedRideOption = rideOptions[rideOptionId as keyof typeof rideOptions] || rideOptions.immediate;

        // Nettoyer les addresses pour ne pas envoyer undefined
        const cleanedAddresses = addresses.map((addr) => {
          const cleaned: any = {
            id: addr.id,
            value: addr.value,
            placeId: addr.placeId,
            type: addr.type,
          };
          if (addr.lat !== undefined) cleaned.lat = addr.lat;
          if (addr.lng !== undefined) cleaned.lng = addr.lng;
          return cleaned;
        });

        const orderData = {
          clientName: client ? `${client.firstName} ${client.lastName}` : 'Client',
          clientPhone: client?.phone || '+68900000000',
          addresses: cleanedAddresses,
          rideOption: selectedRideOption,
          ...(routeInfo ? { routeInfo } : {}),
          passengers: parseInt(params.passengers || '1', 10),
          supplements: supplements.filter((s) => s.quantity > 0),
          paymentMethod: (params.paymentMethod || 'cash') as 'cash' | 'card',
          ...(params.selectedCardId && params.paymentMethod === 'card' ? { selectedCardId: params.selectedCardId } : {}),
          totalPrice: parseFloat(params.totalPrice || '0'),
          driverEarnings: parseFloat(params.driverEarnings || '0'),
          ...(params.scheduledTime ? { scheduledTime: params.scheduledTime } : {}),
          isAdvanceBooking: params.isAdvanceBooking === 'true' || rideOptionId === 'reservation',
        };

        // Créer la commande
        const response = await createOrder(orderData);
        
        if (!mounted) return;

        setOrderId(response.order.id);
        setClientTokenState(response.clientToken);
        await setClientToken(response.clientToken);
        await setCurrentOrderId(response.order.id);

        // Connecter Socket.IO et joindre la session
        try {
          await connectSocketAsync();
          joinClientSession(response.order.id, response.clientToken);
          setStatus('searching');
        } catch (socketError) {
          console.error('Socket connection error:', socketError);
          // Continuer quand même, le polling HTTP peut servir de fallback
          setStatus('searching');
        }
      } catch (err: any) {
        console.error('Error creating order:', err);
        console.error('Order data that failed:', JSON.stringify(orderData, null, 2));
        if (!mounted) return;
        
        // Afficher un message d'erreur plus détaillé
        let errorMessage = 'Erreur lors de la création de la commande';
        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (err?.message) {
          errorMessage = err.message;
        }
        
        // Si c'est une erreur serveur, donner plus de contexte
        if (err?.status >= 500) {
          errorMessage = 'Le serveur rencontre un problème. Vérifiez que toutes les informations sont correctes et réessayez.';
        } else if (err?.status === 400) {
          errorMessage = 'Données invalides. Vérifiez que toutes les informations sont correctes.';
        }
        
        setError(errorMessage);
        setStatus('error');
      }
    };

    createOrderAndJoin();

    return () => {
      mounted = false;
    };
  }, []);

  // Timer de recherche
  useEffect(() => {
    if (status === 'searching') {
      searchTimerRef.current = setInterval(() => {
        setSearchTime((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (searchTimerRef.current) {
        clearInterval(searchTimerRef.current);
      }
    };
  }, [status]);

  // Timer d'expiration (60 secondes)
  useEffect(() => {
    if (status === 'searching' && orderId) {
      expirationTimerRef.current = setTimeout(() => {
        setStatus('expired');
      }, 60000); // 60 secondes
    }

    return () => {
      if (expirationTimerRef.current) {
        clearTimeout(expirationTimerRef.current);
      }
    };
  }, [status, orderId]);

  // Écouter l'assignation du chauffeur
  useEffect(() => {
    if (!orderId || status !== 'searching') return;

    const unsubscribeDriverAssigned = onDriverAssigned((data) => {
      if (data.orderId === orderId) {
        setDriverInfo({
          name: data.driverName,
          driverId: data.driverId,
          sessionId: data.sessionId,
        });
        setStatus('found');
      }
    });

    const unsubscribeOrderExpired = onOrderExpired((data) => {
      if (data.orderId === orderId) {
        setStatus('expired');
      }
    });

    const unsubscribeJoinError = onClientJoinError((data) => {
      console.error('Client join error:', data.message);
      setError(data.message);
      setStatus('error');
    });

    return () => {
      unsubscribeDriverAssigned();
      unsubscribeOrderExpired();
      unsubscribeJoinError();
    };
  }, [orderId, status]);

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    return `${num.toLocaleString('fr-FR')} XPF`;
  };

  const handleCancel = async () => {
    // Nettoyer les données stockées
    if (clientToken) {
      await removeClientToken();
    }
    if (orderId) {
      await removeCurrentOrderId();
    }
    disconnectSocket();
    router.back();
  };

  const handleConfirm = () => {
    if (!orderId) {
      Alert.alert('Erreur', 'Commande non trouvée');
      return;
    }

    router.replace({
      pathname: '/(client)/ride/course-en-cours',
      params: {
        orderId,
        pickup: params.pickup,
        destination: params.destination,
        totalPrice: params.totalPrice,
      },
    });
  };

  if (status === 'creating' || status === 'error') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
            <Ionicons name="close" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text variant="h2">
            {status === 'creating' ? 'Création...' : 'Erreur'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.searchingContainer}>
          {status === 'creating' ? (
            <>
              <ActivityIndicator size="large" color="#F5C400" />
              <Text variant="h3" style={styles.searchingText}>
                Création de la commande...
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="alert-circle" size={64} color="#EF4444" />
              <Text variant="h3" style={styles.searchingText}>
                Erreur
              </Text>
              <Text variant="body" style={styles.errorText}>
                {error || 'Une erreur est survenue'}
              </Text>
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Button title="Retour" onPress={handleCancel} fullWidth />
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'searching') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
            <Ionicons name="close" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text variant="h2">Recherche en cours</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.searchingContainer}>
          <View style={styles.pulseContainer}>
            <ActivityIndicator size="large" color="#F5C400" />
          </View>
          <Text variant="h3" style={styles.searchingText}>
            {"Recherche d'un chauffeur..."}
          </Text>
          <Text variant="body" style={styles.searchingSubtext}>
            {searchTime} secondes
          </Text>

          <Card style={styles.tripCard}>
            <View style={styles.tripRow}>
              <View style={[styles.dot, { backgroundColor: '#22C55E' }]} />
              <Text variant="body" numberOfLines={2} style={styles.tripAddress}>
                {params.pickup}
              </Text>
            </View>
            <View style={styles.tripRow}>
              <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
              <Text variant="body" numberOfLines={2} style={styles.tripAddress}>
                {params.destination}
              </Text>
            </View>
            <View style={styles.tripPriceRow}>
              <Text variant="label">Prix estimé</Text>
              <Text variant="h3" style={styles.priceText}>
                {formatPrice(params.totalPrice || '0')}
              </Text>
            </View>
          </Card>
        </View>

        <View style={styles.footer}>
          <Button title="Annuler la recherche" variant="outline" onPress={handleCancel} fullWidth />
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'found' && driverInfo) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
            <Ionicons name="close" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text variant="h2">Chauffeur trouvé</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.foundContainer}>
          <View style={styles.driverCard}>
            <View style={styles.driverAvatar}>
              <Ionicons name="person" size={48} color="#F5C400" />
            </View>
            <Text variant="h3">{driverInfo.name}</Text>
          </View>

          <Card style={styles.tripCard}>
            <View style={styles.tripRow}>
              <View style={[styles.dot, { backgroundColor: '#22C55E' }]} />
              <Text variant="body" numberOfLines={2} style={styles.tripAddress}>
                {params.pickup}
              </Text>
            </View>
            <View style={styles.tripRow}>
              <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
              <Text variant="body" numberOfLines={2} style={styles.tripAddress}>
                {params.destination}
              </Text>
            </View>
            <View style={styles.tripPriceRow}>
              <Text variant="label">Prix de la course</Text>
              <Text variant="h3" style={styles.priceText}>
                {formatPrice(params.totalPrice || '0')}
              </Text>
            </View>
          </Card>
        </View>

        <View style={styles.footer}>
          <Button title="Commencer la course" onPress={handleConfirm} fullWidth />
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'expired') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
            <Ionicons name="close" size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text variant="h2">Commande expirée</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.notFoundContainer}>
          <Ionicons name="time-outline" size={64} color="#9CA3AF" />
          <Text variant="h3" style={styles.notFoundText}>
            Aucun chauffeur disponible
          </Text>
          <Text variant="body" style={styles.notFoundSubtext}>
            La commande a expiré. Réessayez dans quelques minutes.
          </Text>
        </View>

        <View style={styles.footer}>
          <Button title="Retour" onPress={handleCancel} fullWidth />
        </View>
      </SafeAreaView>
    );
  }

  return null;
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
  searchingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  pulseContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  searchingText: {
    marginBottom: 8,
    textAlign: 'center',
  },
  searchingSubtext: {
    color: '#6b7280',
    marginBottom: 32,
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 16,
  },
  foundContainer: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  driverCard: {
    alignItems: 'center',
    marginBottom: 24,
  },
  driverAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  tripCard: {
    padding: 16,
    width: '100%',
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  tripAddress: {
    flex: 1,
  },
  tripPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
    marginTop: 4,
  },
  priceText: {
    color: '#F5C400',
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  notFoundText: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  notFoundSubtext: {
    color: '#6b7280',
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    paddingBottom: 32,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
});
