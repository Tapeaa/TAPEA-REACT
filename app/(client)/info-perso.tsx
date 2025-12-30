import { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/AuthContext';
import { apiPatch } from '@/lib/api';

export default function InfoPersoScreen() {
  const router = useRouter();
  const { client, refreshClient } = useAuth();
  const [firstName, setFirstName] = useState(client?.firstName || '');
  const [lastName, setLastName] = useState(client?.lastName || '');
  const [email, setEmail] = useState(client?.email || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await apiPatch('/api/client/profile', { firstName, lastName, email });
      await refreshClient();
      Alert.alert('Succès', 'Vos informations ont été mises à jour');
      router.back();
    } catch (err) {
      Alert.alert('Erreur', (err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text variant="h2">Informations personnelles</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card}>
          <View style={styles.form}>
            <Input
              label="Prénom"
              placeholder="Votre prénom"
              value={firstName}
              onChangeText={setFirstName}
            />
            <Input
              label="Nom"
              placeholder="Votre nom"
              value={lastName}
              onChangeText={setLastName}
            />
            <Input
              label="Email (optionnel)"
              placeholder="votre@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <Input
              label="Téléphone"
              value={client?.phone || ''}
              onChangeText={() => {}}
              editable={false}
            />
          </View>
        </Card>

        <Button
          title="Enregistrer"
          onPress={handleSave}
          loading={isLoading}
          disabled={isLoading}
          fullWidth
          style={styles.saveButton}
        />
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
  },
  card: {
    padding: 16,
  },
  form: {
    gap: 16,
  },
  saveButton: {
    marginTop: 24,
  },
});
