import { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Linking, ActivityIndicator, Alert, Platform, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MapView, Marker, isMapsAvailable } from '@/lib/maps';
import {
  connectSocketAsync,
  joinRideRoom,
  updateRideStatus,
  confirmPayment,
  onRideStatusChanged,
  onPaymentStatus,
  onRideCancelled,
  onClientLocationUpdate,
  emitDriverLocation,
  calculateHeading,
  cancelRide,
} from '@/lib/socket';
import { getDriverSessionId, getActiveDriverOrder, getOrder, ApiError } from '@/lib/api';
import * as Location from 'expo-location';
import type { Order, LocationUpdate } from '@/lib/types';

const TAHITI_REGION = {
  latitude: -17.6509,
  longitude: -149.4260,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
};

export default function ChauffeurCourseEnCoursScreen() {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [rideStatus, setRideStatus] = useState<'enroute' | 'arrived' | 'inprogress' | 'completed' | 'payment_pending'>('enroute');
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number; heading?: number } | null>(null);
  const [clientLocation, setClientLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);
  const [orderNotFound, setOrderNotFound] = useState(false);
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{
    status: 'success' | 'failed';
    amount: number;
    paymentMethod?: 'card' | 'cash';
    cardBrand?: string | null;
    cardLast4?: string | null;
    errorMessage?: string;
  } | null>(null);
  const [showPaymentResult, setShowPaymentResult] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);

  const mapRef = useRef<any>(null);
  const locationWatchId = useRef<Location.LocationSubscription | null>(null);
  const lastLocationRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);

  // Récupérer la session et la commande active
  useEffect(() => {
    let mounted = true;

    const fetchOrder = async () => {
      setIsLoadingOrder(true);
      try {
        const sid = await getDriverSessionId();
        if (!sid) {
          router.replace('/(chauffeur)/login');
          return;
        }
        setSessionId(sid);

        const activeOrderResponse = await getActiveDriverOrder(sid);
        if (activeOrderResponse.hasActiveOrder && activeOrderResponse.order) {
          const orderDetails = await getOrder(activeOrderResponse.order.id);
          if (!mounted) return;
          setOrder(orderDetails);
          setRideStatus(orderDetails.status === 'payment_pending' ? 'payment_pending' : orderDetails.status);

          // Connecter Socket.IO et joindre la room
          try {
            await connectSocketAsync();
            joinRideRoom(orderDetails.id, 'driver', { sessionId: sid });
          } catch (socketError) {
            console.error('Socket connection failed:', socketError);
            Alert.alert('Erreur', 'Impossible de se connecter au serveur en temps réel.');
          }
        } else {
          setOrderNotFound(true);
        }
      } catch (err) {
        console.error('Failed to fetch active order:', err);
        if (!mounted) return;
        Alert.alert('Erreur', `Impossible de charger la commande: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
        setOrderNotFound(true);
      } finally {
        setIsLoadingOrder(false);
      }
    };

    fetchOrder();

    return () => {
      mounted = false;
      if (locationWatchId.current) {
        locationWatchId.current.remove();
      }
    };
  }, []);

  // Suivi GPS du chauffeur
  useEffect(() => {
    if (!order || !sessionId) return;

    const startLocationTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission de localisation refusée', 'Veuillez activer la localisation pour le suivi GPS.');
        return;
      }

      locationWatchId.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced, // Optimisé pour la batterie
          timeInterval: 2500, // Mise à jour toutes les 2.5 secondes (optimisé)
          distanceInterval: 10, // Ou si déplacé de 10 mètres (optimisé)
        },
        (newLocation) => {
          const { latitude, longitude, heading, speed } = newLocation.coords;
          
          // Calculer le heading si non disponible
          let calculatedHeading = heading || 0;
          if (lastLocationRef.current && !heading) {
            calculatedHeading = calculateHeading(
              lastLocationRef.current.lat,
              lastLocationRef.current.lng,
              latitude,
              longitude
            );
          }

          setDriverLocation({ latitude, longitude, heading: calculatedHeading });
          
          // Envoyer la position au serveur via Socket.IO
          emitDriverLocation(order.id, sessionId, latitude, longitude, calculatedHeading, speed || undefined);

          // Mettre à jour la caméra de la carte pour suivre le chauffeur
          if (mapRef.current) {
            mapRef.current.animateCamera({
              center: { latitude, longitude },
              heading: calculatedHeading,
              pitch: 45,
              zoom: 15,
            }, { duration: 1000 });
          }

          lastLocationRef.current = { lat: latitude, lng: longitude, timestamp: Date.now() };
        }
      );
    };

    startLocationTracking();

    return () => {
      if (locationWatchId.current) {
        locationWatchId.current.remove();
      }
    };
  }, [order?.id, sessionId]);

  // Écouter les mises à jour de position du client
  useEffect(() => {
    if (!order) return;

    const unsubscribe = onClientLocationUpdate((data: LocationUpdate) => {
      if (data.orderId === order.id) {
        setClientLocation({ latitude: data.lat, longitude: data.lng });
      }
    });

    return () => unsubscribe();
  }, [order?.id]);

  // Écouter les changements de statut
  useEffect(() => {
    if (!order) return;

    const unsubscribe = onRideStatusChanged((data) => {
      if (data.orderId === order.id) {
        setRideStatus(data.status);
        if (data.status === 'completed') {
          setShowPaymentConfirm(true);
        }
      }
    });

    return () => unsubscribe();
  }, [order?.id]);

  // Écouter les statuts de paiement
  useEffect(() => {
    if (!order) return;

    const unsubscribe = onPaymentStatus((data) => {
      if (data.orderId === order.id) {
        setIsPaymentProcessing(false);
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

    return () => unsubscribe();
  }, [order?.id]);

  // Écouter les annulations
  useEffect(() => {
    if (!order) return;

    const unsubscribe = onRideCancelled((data) => {
      if (data.orderId === order.id) {
        Alert.alert('Course annulée', `La course a été annulée par ${data.cancelledBy === 'client' ? 'le client' : 'vous'}.`);
        router.replace('/(chauffeur)');
      }
    });

    return () => unsubscribe();
  }, [order?.id]);

  const formatPrice = (price: number) => `${price.toLocaleString('fr-FR')} XPF`;

  const handleCall = () => {
    if (order?.clientPhone) {
      Linking.openURL(`tel:${order.clientPhone}`);
    }
  };

  const handleMessage = () => {
    // TODO: Implémenter SMS ou chat
    Alert.alert('Info', 'Fonctionnalité de messagerie à venir');
  };

  const handleArrivedAtPickup = () => {
    if (!order || !sessionId) return;
    updateRideStatus(order.id, sessionId, 'arrived');
    setRideStatus('arrived');
  };

  const handleStartRide = () => {
    if (!order || !sessionId) return;
    updateRideStatus(order.id, sessionId, 'inprogress');
    setRideStatus('inprogress');
  };

  const handleCompleteRide = () => {
    if (!order || !sessionId) return;
    updateRideStatus(order.id, sessionId, 'completed');
    setRideStatus('completed');
    setShowPaymentConfirm(true);
  };

  const handleConfirmPayment = (confirmed: boolean) => {
    if (!order || !sessionId) return;
    setIsPaymentProcessing(true);
    confirmPayment(order.id, confirmed, 'driver', { sessionId });
  };

  const handleCancelRide = () => {
    Alert.alert(
      'Annuler la course',
      'Êtes-vous sûr de vouloir annuler cette course ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui',
          onPress: () => {
            if (order && sessionId) {
              cancelRide(order.id, 'driver', 'Chauffeur a annulé', { sessionId });
              router.replace('/(chauffeur)');
            }
          },
        },
      ]
    );
  };

  const handleFinishRide = () => {
    setShowThankYou(false);
    router.replace('/(chauffeur)');
  };

  const getStatusText = () => {
    switch (rideStatus) {
      case 'enroute':
        return 'En route vers le point de prise en charge';
      case 'arrived':
        return 'Vous êtes arrivé';
      case 'inprogress':
        return 'Course en cours';
      case 'completed':
      case 'payment_pending':
        return 'Course terminée - Paiement en attente';
      default:
        return 'Statut inconnu';
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
      case 'payment_pending':
        return '#22C55E';
      default:
        return '#6b7280';
    }
  };

  if (isLoadingOrder) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F5C400" />
          <Text style={styles.loadingText}>Chargement de la course...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (orderNotFound || !order) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Ionicons name="car-outline" size={64} color="#9CA3AF" />
          <Text style={styles.loadingText}>Aucune course active trouvée.</Text>
          <Button title="Retour à l'accueil" onPress={() => router.replace('/(chauffeur)')} />
        </View>
      </SafeAreaView>
    );
  }

  const pickupCoords = order.addresses.find((a) => a.type === 'pickup');
  const destinationCoords = order.addresses.find((a) => a.type === 'destination');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.mapContainer}>
        {isMapsAvailable && (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={TAHITI_REGION}
            showsUserLocation={true}
            showsMyLocationButton={false}
            provider="google"
          >
            {driverLocation && (
              <Marker
                coordinate={driverLocation}
                anchor={{ x: 0.5, y: 0.5 }}
                rotation={driverLocation.heading || 0}
                flat={true}
              >
                <Ionicons name="car-sport" size={30} color="#3B82F6" />
              </Marker>
            )}
            {clientLocation && (
              <Marker coordinate={clientLocation} anchor={{ x: 0.5, y: 0.5 }}>
                <View style={styles.clientMarker}>
                  <View style={styles.clientMarkerInner} />
                </View>
              </Marker>
            )}
            {pickupCoords && pickupCoords.lat && pickupCoords.lng && (
              <Marker
                coordinate={{ latitude: pickupCoords.lat, longitude: pickupCoords.lng }}
                pinColor="green"
              />
            )}
            {destinationCoords && destinationCoords.lat && destinationCoords.lng && (
              <Marker
                coordinate={{ latitude: destinationCoords.lat, longitude: destinationCoords.lng }}
                pinColor="red"
              />
            )}
          </MapView>
        )}
        {!isMapsAvailable && (
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map-outline" size={64} color="#a3ccff" />
            <Text style={styles.mapPlaceholderText}>Carte disponible sur mobile uniquement</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={[styles.statusBanner, { backgroundColor: getStatusColor() }]}>
          <Ionicons
            name={rideStatus === 'arrived' ? 'checkmark-circle' : 'car'}
            size={24}
            color="#FFFFFF"
          />
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>

        <Card style={styles.clientCard}>
          <View style={styles.clientHeader}>
            <View style={styles.clientAvatar}>
              <Ionicons name="person" size={32} color="#F5C400" />
            </View>
            <View style={styles.clientInfo}>
              <Text variant="h3">{order.clientName}</Text>
              <Text variant="caption">{order.clientPhone}</Text>
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
        </Card>

        <Card style={styles.tripCard}>
          <View style={styles.tripRow}>
            <View style={[styles.dot, { backgroundColor: '#22C55E' }]} />
            <Text variant="body" numberOfLines={2} style={styles.tripAddress}>
              {pickupCoords?.value || 'Adresse de départ'}
            </Text>
          </View>
          <View style={styles.tripLine} />
          <View style={styles.tripRow}>
            <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
            <Text variant="body" numberOfLines={2} style={styles.tripAddress}>
              {destinationCoords?.value || 'Adresse de destination'}
            </Text>
          </View>
        </Card>

        <Card style={styles.priceCard}>
          <Text variant="label">Prix de la course</Text>
          <Text variant="h2" style={styles.priceText}>
            {formatPrice(order.totalPrice || 0)}
          </Text>
          <Text variant="caption" style={styles.earningsText}>
            Vos gains: {formatPrice(order.driverEarnings || 0)}
          </Text>
        </Card>
      </View>

      <View style={styles.footer}>
        {rideStatus === 'enroute' && (
          <Button title="J'arrive" onPress={handleArrivedAtPickup} fullWidth />
        )}
        {rideStatus === 'arrived' && (
          <Button title="Démarrer la course" onPress={handleStartRide} fullWidth />
        )}
        {rideStatus === 'inprogress' && (
          <Button title="Terminer la course" onPress={handleCompleteRide} fullWidth />
        )}
        {(rideStatus === 'completed' || rideStatus === 'payment_pending') && (
          <View style={styles.paymentActions}>
            <Button
              title="Confirmer paiement"
              onPress={() => handleConfirmPayment(true)}
              fullWidth
              disabled={isPaymentProcessing}
            />
            {isPaymentProcessing && (
              <ActivityIndicator size="small" color="#F5C400" style={styles.processingIndicator} />
            )}
          </View>
        )}
        {rideStatus !== 'payment_pending' && (
          <Button
            title="Annuler"
            variant="outline"
            onPress={handleCancelRide}
            fullWidth
            style={styles.cancelButton}
          />
        )}
      </View>

      {/* Modal de confirmation de paiement */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showPaymentConfirm}
        onRequestClose={() => setShowPaymentConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text variant="h2" style={styles.modalTitle}>Confirmer le paiement</Text>
            <Text variant="body" style={styles.modalText}>
              Le client a-t-il effectué le paiement de {formatPrice(order.totalPrice)} ?
            </Text>
            <Text variant="caption" style={styles.modalSubtext}>
              Méthode: {order.paymentMethod === 'cash' ? 'Espèces' : 'Carte bancaire'}
            </Text>
            <View style={styles.modalButtons}>
              <Button
                title="Non payé"
                variant="outline"
                onPress={() => {
                  handleConfirmPayment(false);
                  setShowPaymentConfirm(false);
                }}
                style={styles.modalButton}
              />
              <Button
                title="Payé"
                onPress={() => {
                  handleConfirmPayment(true);
                  setShowPaymentConfirm(false);
                }}
                style={styles.modalButton}
                disabled={isPaymentProcessing}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de résultat de paiement */}
      {paymentResult && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={showPaymentResult}
          onRequestClose={() => setShowPaymentResult(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Ionicons
                name={paymentResult.status === 'success' ? 'checkmark-circle' : 'close-circle'}
                size={64}
                color={paymentResult.status === 'success' ? '#22C55E' : '#EF4444'}
                style={styles.modalIcon}
              />
              <Text variant="h2" style={styles.modalTitle}>
                {paymentResult.status === 'success' ? 'Paiement confirmé !' : 'Échec du paiement'}
              </Text>
              <Text variant="body" style={styles.modalText}>
                {paymentResult.status === 'success'
                  ? `Le paiement de ${formatPrice(paymentResult.amount)} a été traité avec succès.`
                  : paymentResult.errorMessage || 'Une erreur est survenue lors du traitement du paiement.'}
              </Text>
              <Button
                title="OK"
                onPress={() => {
                  setShowPaymentResult(false);
                  if (paymentResult.status === 'success') {
                    setShowThankYou(true);
                  }
                }}
                fullWidth
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Modal de remerciement */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showThankYou}
        onRequestClose={handleFinishRide}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="happy-outline" size={64} color="#F5C400" style={styles.modalIcon} />
            <Text variant="h2" style={styles.modalTitle}>Course terminée !</Text>
            <Text variant="body" style={styles.modalText}>
              Merci pour votre service. La course #{order.id.substring(0, 8)}... est terminée.
            </Text>
            <Button title="Retour à l'accueil" onPress={handleFinishRide} fullWidth />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 16,
    color: '#6b7280',
  },
  mapContainer: {
    flex: 1,
    width: '100%',
    height: '50%',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholderText: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 10,
  },
  clientMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  clientMarkerInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f9fafb',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
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
  clientCard: {
    padding: 16,
    marginBottom: 16,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientInfo: {
    flex: 1,
    marginLeft: 12,
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
    flexDirection: 'column',
    gap: 8,
  },
  priceText: {
    color: '#F5C400',
    fontSize: 24,
    fontWeight: 'bold',
  },
  earningsText: {
    color: '#6b7280',
    marginTop: 4,
  },
  footer: {
    padding: 20,
    paddingBottom: 32,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  paymentActions: {
    gap: 8,
  },
  processingIndicator: {
    marginTop: 8,
  },
  cancelButton: {
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
    maxWidth: 400,
  },
  modalIcon: {
    marginBottom: 15,
  },
  modalTitle: {
    marginBottom: 10,
    textAlign: 'center',
  },
  modalText: {
    textAlign: 'center',
    marginBottom: 10,
    color: '#6b7280',
  },
  modalSubtext: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#9ca3af',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
  },
});
