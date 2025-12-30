import { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RIDE_OPTIONS, SUPPLEMENTS, calculatePrice, type Supplement } from '@/lib/types';

export default function CommandeOptionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    type: string;
    pickup?: string;
    pickupPlaceId?: string;
    destination?: string;
    destinationPlaceId?: string;
    stops?: string;
  }>();
  const selectedOption = RIDE_OPTIONS.find((o) => o.id === params.type) || RIDE_OPTIONS[0];

  const [pickup, setPickup] = useState(params.pickup || '');
  const [destination, setDestination] = useState(params.destination || '');
  const [passengers, setPassengers] = useState(1);
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');

  const estimatedDistance = 5;
  const { totalPrice, driverEarnings } = calculatePrice(
    selectedOption,
    estimatedDistance,
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
      alert('Veuillez renseigner les adresses');
      return;
    }
    
    // Navigate to order confirmation/search driver screen
    router.push({
      pathname: '/(client)/ride/recherche-chauffeur',
      params: {
        type: params.type || 'immediate',
        pickup,
        pickupPlaceId: params.pickupPlaceId || '',
        destination,
        destinationPlaceId: params.destinationPlaceId || '',
        passengers: passengers.toString(),
        supplements: JSON.stringify(supplements),
        paymentMethod,
        totalPrice: totalPrice.toString(),
        driverEarnings: driverEarnings.toString(),
      },
    });
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
              onPress={() => setPaymentMethod('card')}
            >
              <Ionicons
                name="card"
                size={24}
                color={paymentMethod === 'card' ? '#F5C400' : '#6b7280'}
              />
              <Text variant="body">Carte</Text>
            </TouchableOpacity>
          </View>
        </Card>

        <Card style={styles.priceCard}>
          <View style={styles.priceRow}>
            <Text variant="body">Prix de base</Text>
            <Text variant="body">{formatPrice(selectedOption.basePrice)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text variant="body">Distance (~{estimatedDistance} km)</Text>
            <Text variant="body">
              {formatPrice(estimatedDistance * selectedOption.pricePerKm)}
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
});
