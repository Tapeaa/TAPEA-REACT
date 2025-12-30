import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import type { PaymentMethod } from '@/lib/types';

export default function WalletScreen() {
  const router = useRouter();
  const { client } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data: paymentMethods, refetch } = useQuery({
    queryKey: ['payment-methods', client?.id],
    queryFn: () => apiFetch<PaymentMethod[]>(`/api/stripe/payment-methods/${client?.id}`),
    enabled: !!client?.id,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const formatPrice = (price: number) => {
    return `${price.toLocaleString('fr-FR')} XPF`;
  };

  const getCardIcon = (brand: string) => {
    switch (brand.toLowerCase()) {
      case 'visa':
        return 'card';
      case 'mastercard':
        return 'card';
      default:
        return 'card-outline';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#F5C400']} />
        }
      >
        <View style={styles.header}>
          <Text variant="h1">Portefeuille</Text>
        </View>

        <Card style={styles.balanceCard}>
          <Text variant="caption" style={styles.balanceLabel}>
            Solde disponible
          </Text>
          <Text variant="h1" style={styles.balanceAmount}>
            {formatPrice(client?.walletBalance || 0)}
          </Text>
        </Card>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="h3">Moyens de paiement</Text>
            <TouchableOpacity
              onPress={() => router.push('/(client)/cartes-bancaires')}
            >
              <Text variant="body" style={styles.seeAll}>
                Voir tout
              </Text>
            </TouchableOpacity>
          </View>

          {paymentMethods && paymentMethods.length > 0 ? (
            <View style={styles.cardsList}>
              {paymentMethods.slice(0, 2).map((card) => (
                <Card key={card.id} style={styles.cardItem}>
                  <View style={styles.cardContent}>
                    <View style={styles.cardIcon}>
                      <Ionicons name={getCardIcon(card.brand)} size={24} color="#1a1a1a" />
                    </View>
                    <View style={styles.cardInfo}>
                      <Text variant="label">
                        {card.brand.charAt(0).toUpperCase() + card.brand.slice(1)} •••• {card.last4}
                      </Text>
                      <Text variant="caption" style={styles.cardExpiry}>
                        Expire {card.expiryMonth}/{card.expiryYear}
                      </Text>
                    </View>
                    {card.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text variant="caption" style={styles.defaultText}>
                          Par défaut
                        </Text>
                      </View>
                    )}
                  </View>
                </Card>
              ))}
            </View>
          ) : (
            <Card style={styles.emptyCard}>
              <Ionicons name="card-outline" size={40} color="#e5e7eb" />
              <Text variant="body" style={styles.emptyText}>
                Aucune carte enregistrée
              </Text>
              <Button
                title="Ajouter une carte"
                variant="outline"
                size="sm"
                onPress={() => router.push('/(client)/cartes-bancaires')}
              />
            </Card>
          )}
        </View>

        <View style={styles.section}>
          <Text variant="h3" style={styles.sectionTitle}>
            Historique des transactions
          </Text>
          <Card style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={40} color="#e5e7eb" />
            <Text variant="body" style={styles.emptyText}>
              Aucune transaction récente
            </Text>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  balanceCard: {
    marginHorizontal: 20,
    backgroundColor: '#F5C400',
    padding: 24,
    alignItems: 'center',
  },
  balanceLabel: {
    color: '#1a1a1a',
    opacity: 0.7,
    marginBottom: 8,
  },
  balanceAmount: {
    color: '#1a1a1a',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  seeAll: {
    color: '#F5C400',
  },
  cardsList: {
    gap: 12,
  },
  cardItem: {
    padding: 16,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardExpiry: {
    color: '#6b7280',
    marginTop: 2,
  },
  defaultBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  defaultText: {
    color: '#059669',
    fontWeight: '600',
    fontSize: 10,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    color: '#6b7280',
  },
});
