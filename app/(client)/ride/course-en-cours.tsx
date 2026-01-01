import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Linking, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PaymentResultModal } from '@/components/PaymentResultModal';
import { ThankYouModal } from '@/components/ThankYouModal';
import { useAuth } from '@/lib/AuthContext';
import {
  getActiveOrder,
  getOrder,
  getClientToken,
  getCurrentOrderId,
  removeClientToken,
  removeCurrentOrderId,
} from '@/lib/api';
import {
  connectSocketAsync,
  joinClientSession,
  joinRideRoom,
  onDriverAssigned,
  onRideStatusChanged,
  onPaymentStatus,
  onPaymentRetryReady,
  onPaymentSwitchedToCash,
  onRideCancelled,
  onDriverLocationUpdate,
  emitClientLocation,
  cancelRide,
  retryPayment,
  switchToCashPayment,
  disconnectSocket,
  calculateHeading,
} from '@/lib/socket';

// Import conditionnel des maps selon la plateforme (Expo gère automatiquement .native.tsx vs .tsx)
import { MapView, Marker, isMapsAvailable } from '@/lib/maps';
import type { Order, LocationUpdate } from '@/lib/types';
import type { OrderDetailsResponse } from '@/lib/api';

export default function CourseEnCoursClientScreen() {
  const router = useRouter();
  const { client } = useAuth();
  const params = useLocalSearchParams<{
    orderId?: string;
    pickup?: string;
    destination?: string;
    totalPrice?: string;
  }>();

  const [order, setOrder] = useState<OrderDetailsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rideStatus, setRideStatus] = useState<'enroute' | 'arrived' | 'inprogress' | 'completed'>('enroute');
  const [clientLocation, setClientLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number; heading?: number } | null>(null);
  const [clientToken, setClientTokenState] = useState<string | null>(null);
  const [showPaymentResult, setShowPaymentResult] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{
    status: 'success' | 'failed';
    amount: number;
    paymentMethod?: 'card' | 'cash';
    cardBrand?: string | null;
    cardLast4?: string | null;
    errorMessage?: string;
  } | null>(null);

  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);
  const lastClientLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  // Initialisation : récupérer la commande active
  useEffect(() => {
    let mounted = true;

    const initializeOrder = async () => {
      try {
        let orderId = params.orderId;
        let token: string | null = null;

        // Si pas d'orderId dans les params, récupérer depuis le stockage ou l'API
        if (!orderId) {
          orderId = await getCurrentOrderId();
        }

        if (!orderId) {
          // Essayer de récupérer la commande active depuis l'API
          const activeOrderResponse = await getActiveOrder();
          if (activeOrderResponse.hasActiveOrder && activeOrderResponse.order) {
            orderId = activeOrderResponse.order.id;
            token = activeOrderResponse.clientToken || null;
          }
        } else {
          // Récupérer le token depuis le stockage
          token = await getClientToken();
        }

        if (!orderId) {
          if (!mounted) return;
          Alert.alert('Erreur', 'Aucune commande active trouvée', [
            { text: 'OK', onPress: () => router.replace('/(client)/') },
          ]);
          return;
        }

        // Récupérer les détails de la commande
        let orderData;
        try {
          orderData = await getOrder(orderId);
          // Mettre en cache la commande pour résilience en cas de perte de connexion
          await cacheOrder(orderData);
        } catch (error) {
          // En cas d'erreur réseau, essayer de récupérer depuis le cache
          console.warn('Failed to fetch order, trying cache:', error);
          const cachedOrder = await getCachedOrder();
          if (cachedOrder && cachedOrder.id === orderId) {
            orderData = cachedOrder;
            console.log('Using cached order data');
          } else {
            throw error;
          }
        }
        if (!mounted) return;

        setOrder(orderData);
        setClientTokenState(token);

        // Mapper le statut de la commande au statut de course
        const statusMap: Record<string, 'enroute' | 'arrived' | 'inprogress' | 'completed'> = {
          accepted: 'enroute',
          driver_enroute: 'enroute',
          driver_arrived: 'arrived',
          in_progress: 'inprogress',
          completed: 'completed',
          payment_pending: 'completed',
          payment_confirmed: 'completed',
        };
        const mappedStatus = (orderData.status && statusMap[orderData.status]) || 'enroute';
        setRideStatus(mappedStatus);

        // Connecter Socket.IO et joindre la session
        if (token) {
          try {
            await connectSocketAsync();
            joinClientSession(orderId, token);
            joinRideRoom(orderId, 'client', { clientToken: token });
          } catch (socketError) {
            console.error('Socket connection error:', socketError);
            // Continuer quand même, le polling HTTP peut servir de fallback
          }
        }
      } catch (error: any) {
        console.error('Error initializing order:', error);
        if (!mounted) return;
        Alert.alert('Erreur', error.message || 'Impossible de charger la commande', [
          { text: 'OK', onPress: () => router.replace('/(client)/') },
        ]);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeOrder();

    return () => {
      mounted = false;
    };
  }, [params.orderId]);

  // Suivi GPS du client (envoyer position au chauffeur)
  useEffect(() => {
    if (!order || !clientToken) return;

    const startLocationTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Location permission not granted');
          return;
        }

        locationWatchRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced, // Optimisé pour la batterie
            timeInterval: 2500, // Envoyer position toutes les 2.5 secondes (optimisé)
            distanceInterval: 15, // Ou tous les 15 mètres (optimisé)
          },
          (location) => {
            const newLocation = {
              lat: location.coords.latitude,
              lng: location.coords.longitude,
            };
            setClientLocation(newLocation);
            lastClientLocationRef.current = newLocation;

            // Envoyer position au chauffeur via Socket.IO
            if (order.id && clientToken) {
              emitClientLocation(order.id, clientToken, newLocation.lat, newLocation.lng);
            }
          }
        );
      } catch (error) {
        console.error('Error starting location tracking:', error);
      }
    };

    startLocationTracking();

    return () => {
      if (locationWatchRef.current) {
        locationWatchRef.current.remove();
        locationWatchRef.current = null;
      }
    };
  }, [order, clientToken]);

  // Écouter l'assignation du chauffeur
  useEffect(() => {
    if (!order) return;

    const unsubscribe = onDriverAssigned((data) => {
      if (data.orderId === order.id) {
        // Recharger les détails de la commande pour avoir les infos du chauffeur
        getOrder(order.id).then((orderData) => {
          setOrder(orderData);
        });
      }
    });

    return unsubscribe;
  }, [order]);

  // Écouter les changements de statut de course
  useEffect(() => {
    if (!order) return;

    const unsubscribe = onRideStatusChanged((data) => {
      if (data.orderId === order.id) {
        setRideStatus(data.status);
      }
    });

    return unsubscribe;
  }, [order]);

  // Écouter les mises à jour de position du chauffeur
  useEffect(() => {
    if (!order) return;

    const unsubscribe = onDriverLocationUpdate((data: LocationUpdate) => {
      if (data.orderId === order.id) {
        setDriverLocation({
          lat: data.lat,
          lng: data.lng,
          heading: data.heading,
        });
      }
    });

    return unsubscribe;
  }, [order]);

  // Écouter les statuts de paiement
  useEffect(() => {
    if (!order) return;

    const unsubscribe = onPaymentStatus((data) => {
      if (data.orderId === order.id) {
        if (data.status === 'payment_confirmed') {
          setPaymentResult({
            status: 'success',
            amount: data.amount || order.totalPrice,
            paymentMethod: (data.paymentMethod as 'card' | 'cash') || order.paymentMethod,
            cardBrand: data.cardBrand,
            cardLast4: data.cardLast4,
          });
          setShowPaymentResult(true);
          setShowThankYou(true);
        } else if (data.status === 'payment_failed') {
          setPaymentResult({
            status: 'failed',
            amount: data.amount || order.totalPrice,
            paymentMethod: (data.paymentMethod as 'card' | 'cash') || order.paymentMethod,
            cardBrand: data.cardBrand,
            cardLast4: data.cardLast4,
            errorMessage: data.errorMessage,
          });
          setShowPaymentResult(true);
        }
      }
    });

    return unsubscribe;
  }, [order]);

  // Écouter les annulations
  useEffect(() => {
    if (!order) return;

    const unsubscribe = onRideCancelled((data) => {
      if (data.orderId === order.id) {
        Alert.alert(
          'Course annulée',
          `La course a été annulée${data.cancelledBy === 'driver' ? ' par le chauffeur' : ' par vous'}.${data.reason ? `\n\nRaison: ${data.reason}` : ''}`,
          [
            {
              text: 'OK',
              onPress: async () => {
                await removeClientToken();
                await removeCurrentOrderId();
                disconnectSocket();
                router.replace('/(client)/');
              },
            },
          ]
        );
      }
    });

    return unsubscribe;
  }, [order]);

  // Nettoyage à la fermeture
  useEffect(() => {
    return () => {
      if (locationWatchRef.current) {
        locationWatchRef.current.remove();
      }
      disconnectSocket();
    };
  }, []);

  const formatPrice = (price: number) => {
    return `${price.toLocaleString('fr-FR')} XPF`;
  };

  const handleCall = () => {
    if (order?.driver?.id) {
      // Utiliser le numéro du chauffeur si disponible, sinon un numéro par défaut
      Linking.openURL('tel:+68940000000');
    }
  };

  const handleMessage = () => {
    if (order?.driver?.id) {
      Linking.openURL('sms:+68940000000');
    }
  };

  const handleCancel = () => {
    if (!order || !clientToken) return;

    Alert.alert('Annuler la course', 'Êtes-vous sûr de vouloir annuler cette course ?', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui',
        style: 'destructive',
        onPress: () => {
          cancelRide(order.id, 'client', 'Annulé par le client', { clientToken });
        },
      },
    ]);
  };

  const handlePaymentRetry = () => {
    if (!order || !clientToken) return;
    setShowPaymentResult(false);
    retryPayment(order.id, clientToken);
  };

  const handleSwitchToCash = () => {
    if (!order || !clientToken) return;
    setShowPaymentResult(false);
    switchToCashPayment(order.id, clientToken);
  };

  const handleComplete = async () => {
    await removeClientToken();
    await removeCurrentOrderId();
    await clearCachedOrder();
    disconnectSocket();
    router.replace('/(client)/');
  };

  const getStatusText = () => {
    switch (rideStatus) {
      case 'enroute':
        return 'Chauffeur en route';
      case 'arrived':
        return 'Votre chauffeur est arrivé';
      case 'inprogress':
        return 'Course en cours';
      case 'completed':
        return 'Course terminée';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (rideStatus) {
      case 'enroute':
        return '#3B82F6';
      case 'arrived':
        return '#22C55E';
      case 'inprogress':
        return '#F5C400';
      case 'completed':
        return '#22C55E';
      default:
        return '#6b7280';
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Ionicons name="car" size={64} color="#F5C400" />
          <Text variant="h3" style={styles.loadingText}>
            Chargement de la course...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text variant="h3" style={styles.loadingText}>
            Commande non trouvée
          </Text>
          <Button title="Retour" onPress={() => router.replace('/(client)/')} fullWidth style={{ marginTop: 20 }} />
        </View>
      </SafeAreaView>
    );
  }

  const pickup = order.addresses.find((a) => a.type === 'pickup');
  const destination = order.addresses.find((a) => a.type === 'destination');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text variant="h2">Course en cours</Text>
        <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
          <Ionicons name="close" size={24} color="#1a1a1a" />
        </TouchableOpacity>
      </View>

      {/* Carte */}
      {isMapsAvailable && (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: driverLocation?.lat || clientLocation?.lat || -17.5399,
              longitude: driverLocation?.lng || clientLocation?.lng || -149.5686,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            showsUserLocation={!!clientLocation}
            showsMyLocationButton={false}
          >
            {driverLocation && (
              <Marker
                coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
                title="Chauffeur"
                rotation={driverLocation.heading}
              >
                <Ionicons name="car" size={32} color="#F5C400" />
              </Marker>
            )}
            {pickup?.lat && pickup?.lng && (
              <Marker
                coordinate={{ latitude: pickup.lat, longitude: pickup.lng }}
                title="Départ"
                pinColor="#22C55E"
              />
            )}
            {destination?.lat && destination?.lng && (
              <Marker
                coordinate={{ latitude: destination.lat, longitude: destination.lng }}
                title="Destination"
                pinColor="#EF4444"
              />
            )}
          </MapView>
        </View>
      )}

      <View style={styles.content}>
        <View style={[styles.statusBanner, { backgroundColor: getStatusColor() }]}>
          <Ionicons
            name={rideStatus === 'arrived' || rideStatus === 'completed' ? 'checkmark-circle' : 'car'}
            size={24}
            color="#FFFFFF"
          />
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>

        {order.driver && (
          <Card style={styles.driverCard}>
            <View style={styles.driverHeader}>
              <View style={styles.driverAvatar}>
                <Ionicons name="person" size={32} color="#F5C400" />
              </View>
              <View style={styles.driverInfo}>
                <Text variant="h3">
                  {order.driver.name || `${order.driver.vehicleModel || 'Chauffeur'}`}
                </Text>
                {order.driver.averageRating && (
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={14} color="#F5C400" />
                    <Text variant="caption">{order.driver.averageRating.toFixed(1)}</Text>
                  </View>
                )}
              </View>
              <View style={styles.contactButtons}>
                <TouchableOpacity style={styles.contactButton} onPress={handleCall}>
                  <Ionicons name="call" size={20} color="#22C55E" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.contactButton} onPress={handleMessage}>
                  <Ionicons name="chatbubble" size={20} color="#3B82F6" />
                </TouchableOpacity>
              </View>
            </View>
            {(order.driver.vehicleModel || order.driver.vehiclePlate) && (
              <View style={styles.vehicleRow}>
                <Ionicons name="car" size={20} color="#6b7280" />
                <Text variant="body">
                  {[order.driver.vehicleModel, order.driver.vehicleColor].filter(Boolean).join(' ')}
                </Text>
                {order.driver.vehiclePlate && (
                  <View style={styles.plateBadge}>
                    <Text style={styles.plateText}>{order.driver.vehiclePlate}</Text>
                  </View>
                )}
              </View>
            )}
          </Card>
        )}

        <Card style={styles.tripCard}>
          {pickup && (
            <View style={styles.tripRow}>
              <View style={[styles.dot, { backgroundColor: '#22C55E' }]} />
              <Text variant="body" numberOfLines={2} style={styles.tripAddress}>
                {pickup.value}
              </Text>
            </View>
          )}
          {pickup && destination && <View style={styles.tripLine} />}
          {destination && (
            <View style={styles.tripRow}>
              <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
              <Text variant="body" numberOfLines={2} style={styles.tripAddress}>
                {destination.value}
              </Text>
            </View>
          )}
        </Card>

        <Card style={styles.priceCard}>
          <Text variant="label">Prix de la course</Text>
          <Text variant="h2" style={styles.priceText}>
            {formatPrice(order.totalPrice)}
          </Text>
        </Card>
      </View>

      <View style={styles.footer}>
        {rideStatus === 'completed' ? (
          <Button title="Terminer" onPress={handleComplete} fullWidth />
        ) : (
          <Button
            title="Signaler un problème"
            variant="outline"
            onPress={() => router.push('/(client)/support')}
            fullWidth
          />
        )}
      </View>

      {/* Modals */}
      {paymentResult && (
        <PaymentResultModal
          visible={showPaymentResult}
          status={paymentResult.status}
          amount={paymentResult.amount}
          paymentMethod={paymentResult.paymentMethod}
          cardBrand={paymentResult.cardBrand}
          cardLast4={paymentResult.cardLast4}
          errorMessage={paymentResult.errorMessage}
          onRetry={handlePaymentRetry}
          onSwitchToCash={handleSwitchToCash}
          onClose={() => {
            setShowPaymentResult(false);
            if (paymentResult.status === 'success') {
              setShowThankYou(true);
            }
          }}
        />
      )}

      <ThankYouModal
        visible={showThankYou}
        onClose={handleComplete}
      />
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
  cancelButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    height: 300,
    backgroundColor: '#e5e7eb',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  driverCard: {
    padding: 16,
    marginBottom: 16,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  driverAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverInfo: {
    flex: 1,
    marginLeft: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  contactButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  plateBadge: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 'auto',
  },
  plateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  tripCard: {
    padding: 16,
    marginBottom: 16,
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  tripLine: {
    width: 2,
    height: 24,
    backgroundColor: '#e5e7eb',
    marginLeft: 5,
    marginVertical: 4,
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
  priceCard: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    color: '#F5C400',
  },
  footer: {
    padding: 20,
    paddingBottom: 32,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
});
