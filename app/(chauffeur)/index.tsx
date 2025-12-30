import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Switch, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
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
} from '@/lib/socket';
import type { Order } from '@/lib/types';

export default function ChauffeurHomeScreen() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingOrderId, setAcceptingOrderId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const sid = await getDriverSessionId();
      if (!sid) {
        router.replace('/(chauffeur)/login');
        return;
      }
      setSessionId(sid);

      const session = await apiFetch<{ isOnline: boolean }>(`/api/driver-sessions/${sid}`);
      setIsOnline(session.isOnline);

      connectSocket();
      joinDriverSession(sid);
    };
    init();

    return () => {
      disconnectSocket();
    };
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

  const handleLogout = async () => {
    await removeDriverSessionId();
    disconnectSocket();
    router.replace('/(chauffeur)/login');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (sessionId) {
      joinDriverSession(sessionId);
    }
    setRefreshing(false);
  };

  const formatPrice = (price: number) => {
    return `${price.toLocaleString('fr-FR')} XPF`;
  };

  const renderOrder = ({ item: order }: { item: Order }) => {
    const pickup = order.addresses.find((a) => a.type === 'pickup');
    const destination = order.addresses.find((a) => a.type === 'destination');
    const isAccepting = acceptingOrderId === order.id;

    return (
      <Card style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <Text variant="label">{order.rideOption.title}</Text>
          <Text variant="h3" style={styles.price}>
            {formatPrice(order.driverEarnings)}
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
              {destination?.value || 'Adresse d\'arrivée'}
            </Text>
          </View>
        </View>

        <View style={styles.orderFooter}>
          <View style={styles.orderInfo}>
            <Text variant="caption">
              {order.passengers} passager{order.passengers > 1 ? 's' : ''}
            </Text>
            <Text variant="caption">
              {order.paymentMethod === 'cash' ? 'Espèces' : 'Carte'}
            </Text>
          </View>
          <Button
            title={isAccepting ? 'Acceptation...' : 'Accepter'}
            onPress={() => handleAcceptOrder(order.id)}
            loading={isAccepting}
            disabled={isAccepting}
            size="sm"
          />
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text variant="h2">Chauffeur</Text>
          <View style={[styles.statusBadge, isOnline ? styles.statusOnline : styles.statusOffline]}>
            <View style={[styles.statusDot, isOnline ? styles.dotOnline : styles.dotOffline]} />
            <Text variant="caption" style={isOnline ? styles.statusTextOnline : styles.statusTextOffline}>
              {isOnline ? 'En ligne' : 'Hors ligne'}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Switch
            value={isOnline}
            onValueChange={handleToggleOnline}
            trackColor={{ false: '#e5e7eb', true: '#BBF7D0' }}
            thumbColor={isOnline ? '#22C55E' : '#9ca3af'}
          />
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {isOnline ? (
        pendingOrders.length > 0 ? (
          <FlatList
            data={pendingOrders}
            renderItem={renderOrder}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#F5C400']} />
            }
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="car-outline" size={64} color="#e5e7eb" />
            <Text variant="h3" style={styles.emptyTitle}>
              En attente de courses
            </Text>
            <Text variant="body" style={styles.emptyText}>
              Les nouvelles commandes apparaîtront ici
            </Text>
          </View>
        )
      ) : (
        <View style={styles.offlineContainer}>
          <Ionicons name="moon-outline" size={64} color="#e5e7eb" />
          <Text variant="h3" style={styles.emptyTitle}>
            Vous êtes hors ligne
          </Text>
          <Text variant="body" style={styles.emptyText}>
            Activez votre statut pour recevoir des courses
          </Text>
        </View>
      )}

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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusOnline: {
    backgroundColor: '#D1FAE5',
  },
  statusOffline: {
    backgroundColor: '#f3f4f6',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotOnline: {
    backgroundColor: '#22C55E',
  },
  dotOffline: {
    backgroundColor: '#9ca3af',
  },
  statusTextOnline: {
    color: '#059669',
    fontWeight: '600',
    fontSize: 11,
  },
  statusTextOffline: {
    color: '#6b7280',
    fontWeight: '600',
    fontSize: 11,
  },
  logoutButton: {
    padding: 8,
  },
  listContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 100,
  },
  orderCard: {
    padding: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  price: {
    color: '#22C55E',
  },
  addressContainer: {
    marginBottom: 16,
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
    height: 20,
    backgroundColor: '#e5e7eb',
    marginLeft: 4,
    marginVertical: 2,
  },
  addressText: {
    flex: 1,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  orderInfo: {
    gap: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  offlineContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
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
    paddingVertical: 16,
    paddingBottom: 32,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
  },
  navText: {
    color: '#6b7280',
  },
});
