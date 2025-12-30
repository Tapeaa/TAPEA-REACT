import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';

export default function ChauffeurGainsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text variant="h1">Mes gains</Text>
      </View>
      <View style={styles.content}>
        <Card style={styles.totalCard}>
          <Text variant="caption" style={styles.label}>Gains du jour</Text>
          <Text variant="h1" style={styles.amount}>0 XPF</Text>
        </Card>
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text variant="caption" style={styles.label}>Cette semaine</Text>
            <Text variant="h3">0 XPF</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text variant="caption" style={styles.label}>Ce mois</Text>
            <Text variant="h3">0 XPF</Text>
          </Card>
        </View>
        <Card style={styles.statsCard}>
          <Text variant="label">Statistiques</Text>
          <View style={styles.statRow}>
            <Text variant="body">Courses effectuées</Text>
            <Text variant="label">0</Text>
          </View>
          <View style={styles.statRow}>
            <Text variant="body">Km parcourus</Text>
            <Text variant="label">0 km</Text>
          </View>
          <View style={styles.statRow}>
            <Text variant="body">Note moyenne</Text>
            <Text variant="label">-</Text>
          </View>
        </Card>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  totalCard: {
    backgroundColor: '#F5C400',
    alignItems: 'center',
    padding: 24,
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
  },
  amount: {
    color: '#1a1a1a',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statsCard: {
    padding: 16,
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
});
