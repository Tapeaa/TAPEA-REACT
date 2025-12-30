import { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { apiFetch } from '@/lib/api';
import type { Order } from '@/lib/types';

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: '#F59E0B' },
  accepted: { label: 'Acceptée', color: '#3B82F6' },
  driver_enroute: { label: 'Chauffeur en route', color: '#3B82F6' },
  driver_arrived: { label: 'Chauffeur arrivé', color: '#8B5CF6' },
  in_progress: { label: 'En cours', color: '#10B981' },
  completed: { label: 'Terminée', color: '#22C55E' },
  cancelled: { label: 'Annulée', color: '#EF4444' },
  expired: { label: 'Expirée', color: '#6B7280' },
  payment_pending: { label: 'Paiement en attente', color: '#F59E0B' },
  payment_confirmed: { label: 'Payée', color: '#22C55E' },
  payment_failed: { label: 'Paiement échoué', color: '#EF4444' },
};

export default function CommandesScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: orders, refetch, isLoading } = useQuery({
    queryKey: ['client-orders'],
    queryFn: () => apiFetch<Order[]>('/api/client/orders'),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    return `${price.toLocaleString('fr-FR')} XPF`;
  };

  const renderOrder = ({ item: order }: { item: Order }) => {
    const status = statusLabels[order.status] || { label: order.status, color: '#6B7280' };
    const pickup = order.addresses.find((a) => a.type === 'pickup');
    const destination = order.addresses.find((a) => a.type === 'destination');

    return (
      <TouchableOpacity
        onPress={() => router.push(`/(client)/course-details/${order.id}`)}
        activeOpacity={0.8}
      >
        <Card style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <Text variant="caption" style={styles.orderDate}>
              {formatDate(order.createdAt)}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
              <Text variant="caption" style={[styles.statusText, { color: status.color }]}>
                {status.label}
              </Text>
            </View>
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
            <Text variant="label">{order.rideOption.title}</Text>
            <Text variant="h3" style={styles.price}>
              {formatPrice(order.totalPrice)}
            </Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text variant="h1">Mes courses</Text>
      </View>

      {orders && orders.length > 0 ? (
        <FlatList
          data={orders}
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
            Aucune course
          </Text>
          <Text variant="body" style={styles.emptyText}>
            Vos courses apparaîtront ici
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  listContent: {
    padding: 20,
    gap: 16,
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
  orderDate: {
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontWeight: '600',
    fontSize: 11,
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
  price: {
    color: '#F5C400',
  },
  emptyContainer: {
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
});
