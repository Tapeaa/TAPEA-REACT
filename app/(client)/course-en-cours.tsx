import { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function CourseEnCoursClientScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    pickup: string;
    destination: string;
    totalPrice: string;
    driverName: string;
    driverRating: string;
    vehicleModel: string;
    vehiclePlate: string;
  }>();

  const [status, setStatus] = useState<'en_route' | 'arrived' | 'in_progress' | 'completed'>('en_route');
  const [eta, setEta] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setEta((prev) => {
        if (prev <= 1) {
          setStatus('arrived');
          return 0;
        }
        return prev - 1;
      });
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const formatPrice = (price: string) => {
    const num = parseInt(price, 10);
    return `${num.toLocaleString('fr-FR')} XPF`;
  };

  const handleCall = () => {
    Linking.openURL('tel:+68940000000');
  };

  const handleMessage = () => {
    Linking.openURL('sms:+68940000000');
  };

  const handleComplete = () => {
    router.replace('/(client)');
  };

  const getStatusText = () => {
    switch (status) {
      case 'en_route':
        return `Chauffeur en route - ${eta} min`;
      case 'arrived':
        return 'Votre chauffeur est arrivé';
      case 'in_progress':
        return 'Course en cours';
      case 'completed':
        return 'Course terminée';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'en_route':
        return '#3B82F6';
      case 'arrived':
        return '#22C55E';
      case 'in_progress':
        return '#F5C400';
      case 'completed':
        return '#22C55E';
      default:
        return '#6b7280';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text variant="h2">Course en cours</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={[styles.statusBanner, { backgroundColor: getStatusColor() }]}>
          <Ionicons
            name={status === 'arrived' ? 'checkmark-circle' : 'car'}
            size={24}
            color="#FFFFFF"
          />
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>

        <Card style={styles.driverCard}>
          <View style={styles.driverHeader}>
            <View style={styles.driverAvatar}>
              <Ionicons name="person" size={32} color="#F5C400" />
            </View>
            <View style={styles.driverInfo}>
              <Text variant="h3">{params.driverName}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color="#F5C400" />
                <Text variant="caption">{params.driverRating}</Text>
              </View>
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
          <View style={styles.vehicleRow}>
            <Ionicons name="car" size={20} color="#6b7280" />
            <Text variant="body">{params.vehicleModel}</Text>
            <View style={styles.plateBadge}>
              <Text style={styles.plateText}>{params.vehiclePlate}</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.tripCard}>
          <View style={styles.tripRow}>
            <View style={[styles.dot, { backgroundColor: '#22C55E' }]} />
            <Text variant="body" numberOfLines={2} style={styles.tripAddress}>
              {params.pickup}
            </Text>
          </View>
          <View style={styles.tripLine} />
          <View style={styles.tripRow}>
            <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
            <Text variant="body" numberOfLines={2} style={styles.tripAddress}>
              {params.destination}
            </Text>
          </View>
        </Card>

        <Card style={styles.priceCard}>
          <Text variant="label">Prix de la course</Text>
          <Text variant="h2" style={styles.priceText}>
            {formatPrice(params.totalPrice || '0')}
          </Text>
        </Card>
      </View>

      <View style={styles.footer}>
        {status === 'completed' ? (
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
