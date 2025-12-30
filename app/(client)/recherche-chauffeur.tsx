import { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function RechercheChauffeureScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    type: string;
    pickup: string;
    destination: string;
    passengers: string;
    totalPrice: string;
    paymentMethod: string;
  }>();

  const [status, setStatus] = useState<'searching' | 'found' | 'not_found'>('searching');
  const [searchTime, setSearchTime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSearchTime((prev) => prev + 1);
    }, 1000);

    const searchTimeout = setTimeout(() => {
      setStatus('found');
    }, 5000);

    return () => {
      clearInterval(timer);
      clearTimeout(searchTimeout);
    };
  }, []);

  const formatPrice = (price: string) => {
    const num = parseInt(price, 10);
    return `${num.toLocaleString('fr-FR')} XPF`;
  };

  const handleCancel = () => {
    router.back();
  };

  const handleConfirm = () => {
    router.push({
      pathname: '/(client)/course-en-cours',
      params: {
        pickup: params.pickup,
        destination: params.destination,
        totalPrice: params.totalPrice,
        driverName: 'Jean Dupont',
        driverRating: '4.8',
        vehicleModel: 'Toyota Prius',
        vehiclePlate: 'AB-123-CD',
      },
    });
  };

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
              <Text variant="body" numberOfLines={1} style={styles.tripAddress}>
                {params.pickup}
              </Text>
            </View>
            <View style={styles.tripRow}>
              <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
              <Text variant="body" numberOfLines={1} style={styles.tripAddress}>
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

  if (status === 'found') {
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
            <Text variant="h3">Jean Dupont</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={16} color="#F5C400" />
              <Text variant="body">4.8</Text>
              <Text variant="caption"> (245 courses)</Text>
            </View>
          </View>

          <Card style={styles.vehicleCard}>
            <View style={styles.vehicleInfo}>
              <Ionicons name="car" size={32} color="#6b7280" />
              <View>
                <Text variant="body">Toyota Prius</Text>
                <Text variant="caption">AB-123-CD</Text>
              </View>
            </View>
            <Text variant="label">Arrivée dans ~3 min</Text>
          </Card>

          <Card style={styles.tripCard}>
            <View style={styles.tripRow}>
              <View style={[styles.dot, { backgroundColor: '#22C55E' }]} />
              <Text variant="body" numberOfLines={1} style={styles.tripAddress}>
                {params.pickup}
              </Text>
            </View>
            <View style={styles.tripRow}>
              <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
              <Text variant="body" numberOfLines={1} style={styles.tripAddress}>
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
          <Button title="Confirmer la course" onPress={handleConfirm} fullWidth />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
          <Ionicons name="close" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text variant="h2">Aucun chauffeur</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.notFoundContainer}>
        <Ionicons name="car-outline" size={64} color="#9CA3AF" />
        <Text variant="h3" style={styles.notFoundText}>
          Aucun chauffeur disponible
        </Text>
        <Text variant="body" style={styles.notFoundSubtext}>
          Réessayez dans quelques minutes
        </Text>
      </View>

      <View style={styles.footer}>
        <Button title="Retour" onPress={handleCancel} fullWidth />
      </View>
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
  },
  searchingSubtext: {
    color: '#6b7280',
    marginBottom: 32,
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
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 16,
    width: '100%',
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tripCard: {
    padding: 16,
    width: '100%',
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
  },
  notFoundSubtext: {
    color: '#6b7280',
  },
  footer: {
    padding: 20,
    paddingBottom: 32,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
});
