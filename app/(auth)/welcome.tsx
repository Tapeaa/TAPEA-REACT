import { View, StyleSheet, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.heroContainer}>
          <Image
            source={require('@/assets/images/taxi.png')}
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.textContainer}>
          <Text variant="h1" style={styles.title}>
            Bienvenue sur TĀPE'A
          </Text>
          <Text variant="body" style={styles.subtitle}>
            Votre service de taxi en Polynésie française. Réservez facilement et voyagez en toute sérénité.
          </Text>
        </View>

        <View style={styles.buttonsContainer}>
          <Button
            title="Se connecter"
            onPress={() => router.push('/(auth)/login')}
            fullWidth
          />
          <Button
            title="Créer un compte"
            variant="outline"
            onPress={() => router.push('/(auth)/register')}
            fullWidth
            style={styles.registerButton}
          />
          <Button
            title="Accès chauffeur"
            variant="ghost"
            onPress={() => router.push('/(chauffeur)/login')}
            fullWidth
            style={styles.driverButton}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  logo: {
    width: 200,
    height: 60,
  },
  heroContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  heroImage: {
    width: width * 0.8,
    height: width * 0.6,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    textAlign: 'center',
    color: '#6b7280',
    paddingHorizontal: 20,
  },
  buttonsContainer: {
    gap: 12,
  },
  registerButton: {
    marginTop: 0,
  },
  driverButton: {
    marginTop: 8,
  },
});
