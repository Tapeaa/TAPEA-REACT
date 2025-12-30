import { useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/AuthContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

const rideOptions = [
  {
    id: 'immediate',
    title: 'Taxi immédiat',
    subtitle: '10 - 20 min',
    image: require('@/assets/images/taxi.png'),
    color: '#FEF3C7',
  },
  {
    id: 'reservation',
    title: 'Réservation',
    subtitle: 'Planifier à l\'avance',
    image: require('@/assets/images/calendar.png'),
    color: '#DBEAFE',
  },
  {
    id: 'tour',
    title: 'Tour de l\'île',
    subtitle: 'Découvrir Tahiti',
    image: require('@/assets/images/island.png'),
    color: '#D1FAE5',
  },
];

export default function ClientHomeScreen() {
  const router = useRouter();
  const { client } = useAuth();

  const handleRideOption = (optionId: string) => {
    router.push({
      pathname: '/(client)/commande-options',
      params: { type: optionId },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text variant="caption" style={styles.greeting}>
              Ia ora na 👋
            </Text>
            <Text variant="h2">
              {client?.firstName || 'Bienvenue'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push('/(client)/profil')}
          >
            <Ionicons name="notifications-outline" size={24} color="#1a1a1a" />
          </TouchableOpacity>
        </View>

        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text variant="h3" style={styles.sectionTitle}>
          Où allez-vous ?
        </Text>

        <View style={styles.optionsGrid}>
          {rideOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[styles.optionCard, { backgroundColor: option.color }]}
              onPress={() => handleRideOption(option.id)}
              activeOpacity={0.8}
            >
              <Image
                source={option.image}
                style={styles.optionImage}
                resizeMode="contain"
              />
              <Text variant="label" style={styles.optionTitle}>
                {option.title}
              </Text>
              <Text variant="caption" style={styles.optionSubtitle}>
                {option.subtitle}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Card style={styles.promoCard}>
          <View style={styles.promoContent}>
            <View style={styles.promoTextContainer}>
              <Text variant="h3" style={styles.promoTitle}>
                Première course ?
              </Text>
              <Text variant="body" style={styles.promoText}>
                Bénéficiez de -10% sur votre première réservation
              </Text>
            </View>
            <Image
              source={require('@/assets/images/discount.png')}
              style={styles.promoImage}
              resizeMode="contain"
            />
          </View>
        </Card>

        <View style={styles.quickActions}>
          <Text variant="h3" style={styles.sectionTitle}>
            Accès rapide
          </Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/(client)/commandes')}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="list" size={24} color="#F5C400" />
              </View>
              <Text variant="caption">Mes courses</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/(client)/wallet')}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="wallet" size={24} color="#F5C400" />
              </View>
              <Text variant="caption">Portefeuille</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/(client)/profil')}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="person" size={24} color="#F5C400" />
              </View>
              <Text variant="caption">Profil</Text>
            </TouchableOpacity>
          </View>
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
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  greeting: {
    color: '#6b7280',
    marginBottom: 4,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  logo: {
    width: 180,
    height: 50,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  optionCard: {
    width: CARD_WIDTH,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  optionImage: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  optionTitle: {
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  optionSubtitle: {
    color: '#6b7280',
    textAlign: 'center',
  },
  promoCard: {
    backgroundColor: '#F5C400',
    marginBottom: 24,
  },
  promoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoTextContainer: {
    flex: 1,
  },
  promoTitle: {
    color: '#1a1a1a',
    marginBottom: 4,
  },
  promoText: {
    color: '#1a1a1a',
    opacity: 0.8,
  },
  promoImage: {
    width: 60,
    height: 60,
  },
  quickActions: {
    marginBottom: 24,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
