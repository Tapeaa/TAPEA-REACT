import { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  Switch, 
  TouchableOpacity, 
  ScrollView,
  Image,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { getDriverSessionId, removeDriverSessionId, apiFetch, apiPatch } from '@/lib/api';
import {
  connectSocket,
  joinDriverSession,
  updateDriverStatus,
  acceptOrder,
  onNewOrder,
  onPendingOrders,
  onOrderTaken,
  onOrderExpired,
  onOrderAcceptSuccess,
  onOrderAcceptError,
  disconnectSocket,
  isSocketConnected,
} from '@/lib/socket';
import type { Order } from '@/lib/types';

const { width } = Dimensions.get('window');

const categories = [
  { id: 'commandes', label: 'Commandes', icon: require('@/assets/images/icon-commandes.png'), href: '/(chauffeur)/courses' },
  { id: 'paiement', label: 'Paiement', icon: require('@/assets/images/icon-paiement.png'), href: '/(chauffeur)/gains' },
  { id: 'documents', label: 'Documents', icon: require('@/assets/images/icon-documents.png'), href: '/(chauffeur)/profil' },
  { id: 'contact', label: 'Contact', icon: require('@/assets/images/icon-contact.png'), href: '/(chauffeur)/profil' },
];

export default function ChauffeurHomeScreen() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingOrderId, setAcceptingOrderId] = useState<string | null>(null);
  const [decliningOrderId, setDecliningOrderId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const init = async () => {
      const sid = await getDriverSessionId();
      if (!sid) {
        router.replace('/(chauffeur)/login');
        return;
      }
      setSessionId(sid);

      try {
        const session = await apiFetch<{ isOnline: boolean }>(`/api/driver-sessions/${sid}`);
        setIsOnline(session.isOnline);
      } catch (err) {
        console.log('Failed to fetch session status');
      }

      connectSocket();
      joinDriverSession(sid);
      setConnectionStatus('connected');
    };
    init();

    return () => {
      disconnectSocket();
    };
  }, []);

  useEffect(() => {
    const checkConnection = setInterval(() => {
      setConnectionStatus(isSocketConnected() ? 'connected' : 'disconnected');
    }, 3000);

    return () => clearInterval(checkConnection);
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const unsubNewOrder = onNewOrder((order) => {
      setPendingOrders((prev) => {
        if (prev.some((o) => o.id === order.id)) return prev;
        return [order, ...prev];
      });
    });

    const unsubPendingOrders = onPendingOrders((orders) => {
      setPendingOrders(orders);
    });

    const unsubOrderTaken = onOrderTaken(({ orderId }) => {
      setPendingOrders((prev) => prev.filter((o) => o.id !== orderId));
    });

    const unsubOrderExpired = onOrderExpired(({ orderId }) => {
      setPendingOrders((prev) => prev.filter((o) => o.id !== orderId));
    });

    const unsubAcceptSuccess = onOrderAcceptSuccess((order) => {
      setAcceptingOrderId(null);
      router.push('/(chauffeur)/course-en-cours');
    });

    const unsubAcceptError = onOrderAcceptError(({ message }) => {
      setAcceptingOrderId(null);
      alert(message);
    });

    return () => {
      unsubNewOrder();
      unsubPendingOrders();
      unsubOrderTaken();
      unsubOrderExpired();
      unsubAcceptSuccess();
      unsubAcceptError();
    };
  }, [sessionId]);

  const handleToggleOnline = async (value: boolean) => {
    if (!sessionId) return;

    setIsOnline(value);
    updateDriverStatus(sessionId, value);

    try {
      await apiPatch(`/api/driver-sessions/${sessionId}/status`, { isOnline: value });
    } catch (err) {
      setIsOnline(!value);
    }
  };

  const handleAcceptOrder = (orderId: string) => {
    if (!sessionId) return;
    setAcceptingOrderId(orderId);
    acceptOrder(orderId, sessionId);
  };

  const handleDeclineOrder = (orderId: string) => {
    setDecliningOrderId(orderId);
    setTimeout(() => {
      setPendingOrders((prev) => prev.filter((o) => o.id !== orderId));
      setDecliningOrderId(null);
    }, 300);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (sessionId) {
      joinDriverSession(sessionId);
    }
    setRefreshing(false);
  };

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

  const formatPrice = (price: number) => {
    return `${price.toLocaleString('fr-FR')} XPF`;
  };

  return (
    <View style={styles.container}>
      {/* Map Placeholder Background */}
      <View style={styles.mapBackground}>
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map-outline" size={64} color="#a3ccff" />
          <Text style={styles.mapPlaceholderText}>Carte</Text>
        </View>
      </View>

      {/* Header */}
      <SafeAreaView style={styles.header} edges={['top']}>
        <View style={styles.headerContent}>
          {/* Menu Button */}
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => router.push('/(chauffeur)/profil')}
            activeOpacity={0.8}
          >
            <Ionicons name="menu" size={20} color="#343434" />
          </TouchableOpacity>

          {/* Logo */}
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          {/* Support Button */}
          <TouchableOpacity
            style={styles.supportButton}
            onPress={() => router.push('/(chauffeur)/profil')}
            activeOpacity={0.8}
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
                activeOpacity={0.8}
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

        {/* Scroll Progress Indicator */}
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

      {/* Online/Offline Status Toggle */}
      <View style={styles.statusToggleContainer}>
        <View style={[
          styles.statusToggleCard,
          isOnline ? styles.statusToggleOnline : styles.statusToggleOffline
        ]}>
          <View style={styles.statusToggleContent}>
            <Ionicons 
              name="power" 
              size={28} 
              color={isOnline ? '#22C55E' : '#EF4444'} 
            />
            <Text style={[
              styles.statusToggleText,
              isOnline ? styles.statusTextOnline : styles.statusTextOffline
            ]}>
              {isOnline ? 'EN LIGNE' : 'HORS LIGNE'}
            </Text>
          </View>
          <Switch
            value={isOnline}
            onValueChange={handleToggleOnline}
            trackColor={{ false: '#e5e7eb', true: '#ffdf6d' }}
            thumbColor={isOnline ? '#ffffff' : '#9ca3af'}
            ios_backgroundColor="#e5e7eb"
          />
        </View>
      </View>

      {/* Connection Status Indicator */}
      <View style={styles.connectionIndicator}>
        <View style={[
          styles.connectionDot,
          connectionStatus === 'connected' ? styles.connectionConnected :
          connectionStatus === 'connecting' ? styles.connectionConnecting :
          styles.connectionDisconnected
        ]} />
        <Text style={styles.connectionText}>
          {connectionStatus === 'connected' ? 'Connecté' :
           connectionStatus === 'connecting' ? 'Connexion...' :
           'Déconnecté'}
        </Text>
      </View>

      {/* Bottom Panel - Pending Orders or Waiting State */}
      <View style={styles.bottomPanel}>
        <ScrollView
          style={styles.bottomPanelScroll}
          contentContainerStyle={styles.bottomPanelContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh} 
              colors={['#F5C400']} 
            />
          }
        >
          {isOnline ? (
            pendingOrders.length > 0 ? (
              <View style={styles.ordersContainer}>
                <Text variant="label" style={styles.ordersTitle}>
                  Commandes en attente ({pendingOrders.length})
                </Text>
                {pendingOrders.map((order) => {
                  const pickup = order.addresses?.find((a) => a.type === 'pickup');
                  const destination = order.addresses?.find((a) => a.type === 'destination');
                  const isAccepting = acceptingOrderId === order.id;
                  const isDeclining = decliningOrderId === order.id;

                  return (
                    <Card key={order.id} style={styles.orderCard}>
                      <View style={styles.orderHeader}>
                        <View style={styles.orderTypeContainer}>
                          <Ionicons name="car" size={16} color="#F5C400" />
                          <Text variant="label">{order.rideOption?.title || 'Course'}</Text>
                        </View>
                        <Text variant="h3" style={styles.price}>
                          {formatPrice(order.driverEarnings || 0)}
                        </Text>
                      </View>

                      <View style={styles.addressContainer}>
                        <View style={styles.addressRow}>
                          <View style={[styles.dot, { backgroundColor: '#22C55E' }]} />
                          <Text variant="body" numberOfLines={1} style={styles.addressText}>
                            {pickup?.value || 'Adresse de départ'}
                          </Text>
                        </View>
                        <View style={styles.addressLine} />
                        <View style={styles.addressRow}>
                          <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
                          <Text variant="body" numberOfLines={1} style={styles.addressText}>
                            {destination?.value || "Adresse d'arrivée"}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.orderInfo}>
                        <View style={styles.infoItem}>
                          <Ionicons name="people" size={14} color="#6b7280" />
                          <Text variant="caption" style={styles.infoText}>
                            {order.passengers || 1} passager{(order.passengers || 1) > 1 ? 's' : ''}
                          </Text>
                        </View>
                        <View style={styles.infoItem}>
                          <Ionicons name="cash" size={14} color="#6b7280" />
                          <Text variant="caption" style={styles.infoText}>
                            {order.paymentMethod === 'cash' ? 'Espèces' : 'Carte'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.orderActions}>
                        <TouchableOpacity
                          style={[styles.declineButton, isDeclining && styles.buttonDisabled]}
                          onPress={() => handleDeclineOrder(order.id)}
                          disabled={isDeclining || isAccepting}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="close" size={20} color="#EF4444" />
                          <Text style={styles.declineText}>Refuser</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={[styles.acceptButton, isAccepting && styles.buttonDisabled]}
                          onPress={() => handleAcceptOrder(order.id)}
                          disabled={isAccepting || isDeclining}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="checkmark" size={20} color="#ffffff" />
                          <Text style={styles.acceptText}>
                            {isAccepting ? 'Acceptation...' : 'Accepter'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </Card>
                  );
                })}
              </View>
            ) : (
              <View style={styles.waitingContainer}>
                <Ionicons name="car-outline" size={48} color="#e5e7eb" />
                <Text variant="h3" style={styles.waitingTitle}>
                  En attente de courses
                </Text>
                <Text variant="body" style={styles.waitingText}>
                  Les nouvelles commandes apparaîtront ici
                </Text>
              </View>
            )
          ) : (
            <View style={styles.offlineContainer}>
              <Ionicons name="moon-outline" size={48} color="#e5e7eb" />
              <Text variant="h3" style={styles.offlineTitle}>
                Vous êtes hors ligne
              </Text>
              <Text variant="body" style={styles.offlineText}>
                Activez votre statut pour recevoir des courses
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(chauffeur)/courses')}>
          <Ionicons name="list" size={24} color="#6b7280" />
          <Text variant="caption" style={styles.navText}>Courses</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(chauffeur)/gains')}>
          <Ionicons name="wallet" size={24} color="#6b7280" />
          <Text variant="caption" style={styles.navText}>Gains</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(chauffeur)/profil')}>
          <Ionicons name="person" size={24} color="#6b7280" />
          <Text variant="caption" style={styles.navText}>Profil</Text>
        </TouchableOpacity>
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
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#e8f4ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholderText: {
    marginTop: 8,
    fontSize: 16,
    color: '#5c5c5c',
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

  statusToggleContainer: {
    position: 'absolute',
    top: 180,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  statusToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  statusToggleOnline: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#22C55E',
  },
  statusToggleOffline: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  statusToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusToggleText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statusTextOnline: {
    color: '#22C55E',
  },
  statusTextOffline: {
    color: '#EF4444',
  },

  connectionIndicator: {
    position: 'absolute',
    top: 260,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 10,
    gap: 6,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectionConnected: {
    backgroundColor: '#22C55E',
  },
  connectionConnecting: {
    backgroundColor: '#F5C400',
  },
  connectionDisconnected: {
    backgroundColor: '#EF4444',
  },
  connectionText: {
    fontSize: 12,
    color: '#5c5c5c',
    fontWeight: '500',
  },

  bottomPanel: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    maxHeight: '45%',
    zIndex: 10,
  },
  bottomPanelScroll: {
    flex: 1,
  },
  bottomPanelContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    minHeight: 150,
  },

  ordersContainer: {
    gap: 12,
  },
  ordersTitle: {
    marginBottom: 8,
    color: '#343434',
  },
  orderCard: {
    padding: 16,
    marginBottom: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  price: {
    color: '#22C55E',
  },
  addressContainer: {
    marginBottom: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  addressLine: {
    width: 2,
    height: 16,
    backgroundColor: '#e5e7eb',
    marginLeft: 4,
    marginVertical: 2,
  },
  addressText: {
    flex: 1,
    color: '#343434',
  },
  orderInfo: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    color: '#6b7280',
  },
  orderActions: {
    flexDirection: 'row',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  declineText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 14,
  },
  acceptButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#22C55E',
  },
  acceptText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  waitingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  waitingTitle: {
    marginTop: 12,
    marginBottom: 4,
    color: '#343434',
  },
  waitingText: {
    color: '#6b7280',
    textAlign: 'center',
  },

  offlineContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  offlineTitle: {
    marginTop: 12,
    marginBottom: 4,
    color: '#343434',
  },
  offlineText: {
    color: '#6b7280',
    textAlign: 'center',
  },

  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    zIndex: 20,
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
  },
  navText: {
    color: '#6b7280',
  },
});
