import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { RIDE_OPTIONS, SUPPLEMENTS } from '@/lib/types';

export default function TarifsScreen() {
  const router = useRouter();

  const formatPrice = (price: number) => `${price.toLocaleString('fr-FR')} XPF`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text variant="h2">Grille tarifaire</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="h3" style={styles.sectionTitle}>
          Types de course
        </Text>
        {RIDE_OPTIONS.map((option) => (
          <Card key={option.id} style={styles.optionCard}>
            <View style={styles.optionHeader}>
              <Text variant="label">{option.title}</Text>
              <Text variant="h3" style={styles.price}>
                {formatPrice(option.basePrice)}
              </Text>
            </View>
            <View style={styles.optionDetails}>
              <View style={styles.detailRow}>
                <Text variant="caption">Durée estimée</Text>
                <Text variant="body">{option.duration}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text variant="caption">Capacité</Text>
                <Text variant="body">{option.capacity}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text variant="caption">Prix au km</Text>
                <Text variant="body">
                  {option.pricePerKm > 0 ? formatPrice(option.pricePerKm) : 'Inclus'}
                </Text>
              </View>
            </View>
          </Card>
        ))}

        <Text variant="h3" style={styles.sectionTitle}>
          Suppléments
        </Text>
        {SUPPLEMENTS.map((supp) => (
          <Card key={supp.id} style={styles.supplementCard}>
            <View style={styles.supplementRow}>
              <View style={styles.supplementInfo}>
                <Ionicons
                  name={supp.id === 'bagages' ? 'briefcase' : 'cube'}
                  size={24}
                  color="#6b7280"
                />
                <Text variant="body">{supp.name}</Text>
              </View>
              <Text variant="label">{formatPrice(supp.price)} / unité</Text>
            </View>
          </Card>
        ))}

        <Card style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#3B82F6" />
          <View style={styles.infoContent}>
            <Text variant="label">Information</Text>
            <Text variant="caption">
              Les prix sont indicatifs et peuvent varier en fonction de la distance réelle et des conditions de circulation.
            </Text>
          </View>
        </Card>
      </ScrollView>
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
    gap: 12,
    paddingBottom: 32,
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 4,
  },
  optionCard: {
    padding: 16,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  price: {
    color: '#F5C400',
  },
  optionDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  supplementCard: {
    padding: 16,
  },
  supplementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  supplementInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: '#EFF6FF',
    marginTop: 8,
  },
  infoContent: {
    flex: 1,
  },
});
