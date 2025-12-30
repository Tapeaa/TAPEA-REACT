import { View, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';

export default function SupportScreen() {
  const router = useRouter();

  const handleCall = () => {
    Linking.openURL('tel:+68940000000');
  };

  const handleEmail = () => {
    Linking.openURL('mailto:support@tapea.pf');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text variant="h2">Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text variant="h3" style={styles.title}>
          Comment pouvons-nous vous aider ?
        </Text>
        <Text variant="body" style={styles.subtitle}>
          Notre équipe est disponible du lundi au samedi de 6h à 22h.
        </Text>

        <View style={styles.contactOptions}>
          <TouchableOpacity onPress={handleCall}>
            <Card style={styles.contactCard}>
              <View style={styles.contactIcon}>
                <Ionicons name="call" size={28} color="#F5C400" />
              </View>
              <Text variant="label">Nous appeler</Text>
              <Text variant="caption">+689 40 00 00 00</Text>
            </Card>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleEmail}>
            <Card style={styles.contactCard}>
              <View style={styles.contactIcon}>
                <Ionicons name="mail" size={28} color="#F5C400" />
              </View>
              <Text variant="label">Email</Text>
              <Text variant="caption">support@tapea.pf</Text>
            </Card>
          </TouchableOpacity>
        </View>

        <Card style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#3B82F6" />
          <View style={styles.infoContent}>
            <Text variant="label">Temps de réponse</Text>
            <Text variant="caption">
              Nous nous efforçons de répondre à toutes les demandes dans un délai de 24 heures.
            </Text>
          </View>
        </Card>
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
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    color: '#6b7280',
    marginBottom: 32,
  },
  contactOptions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    minHeight: 140,
  },
  contactCard: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 130,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: '#EFF6FF',
  },
  infoContent: {
    flex: 1,
  },
});
