import { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { apiPost, setDriverSessionId } from '@/lib/api';

export default function ChauffeurLoginScreen() {
  const router = useRouter();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleCodeChange = (value: string, index: number) => {
    if (value.length > 1) {
      const digits = value.split('').slice(0, 6);
      const newCode = [...code];
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newCode[index + i] = digit;
        }
      });
      setCode(newCode);
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
    } else {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);

      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleLogin = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('Veuillez entrer le code à 6 chiffres');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await apiPost<{
        success?: boolean;
        driver?: { id: string; firstName: string; lastName: string };
        session?: { id: string };
        error?: string;
      }>('/api/driver/login', { code: fullCode }, { skipAuth: true, retry: false });

      if (data.success && data.driver && data.session) {
        await setDriverSessionId(data.session.id);
        router.replace('/(chauffeur)/');
      } else {
        setError(data.error || 'Code invalide');
      }
    } catch (err: any) {
      console.error('Driver login error:', err);
      // Afficher un message d'erreur plus clair
      if (err instanceof Error) {
        const errorMessage = err.message || '';
        
        if (errorMessage.includes('401') || errorMessage.includes('Code incorrect') || errorMessage.includes('Code invalide')) {
          setError('Code incorrect. Veuillez vérifier votre code d\'accès.');
        } else if (errorMessage.includes('403') || errorMessage.includes('désactivé')) {
          setError('Votre compte chauffeur est désactivé. Contactez le support.');
        } else if (errorMessage.includes('502') || errorMessage.includes('backend est inaccessible')) {
          setError('Le serveur backend est inaccessible. Vérifiez que le serveur est démarré et que l\'URL API est correcte.');
        } else if (errorMessage.includes('503') || errorMessage.includes('indisponible')) {
          setError('Le serveur est temporairement indisponible. Réessayez dans quelques instants.');
        } else if (errorMessage.includes('500') || errorMessage.includes('Erreur interne')) {
          setError('Erreur serveur. Le code peut être invalide ou le serveur rencontre un problème. Réessayez.');
        } else if (errorMessage.includes('network') || errorMessage.includes('connexion') || errorMessage.includes('contacter le serveur')) {
          setError('Impossible de se connecter au serveur. Vérifiez votre connexion internet.');
        } else {
          // Afficher le message d'erreur réel du serveur
          setError(errorMessage || 'Erreur lors de la connexion');
        }
      } else {
        setError('Code invalide ou erreur serveur');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.header}>
          <Text variant="h1">Accès Chauffeur</Text>
          <Text variant="body" style={styles.subtitle}>
            {"Entrez votre code d'accès à 6 chiffres"}
          </Text>
        </View>

        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[
                styles.codeInput,
                digit ? styles.codeInputFilled : null,
                error ? styles.codeInputError : null,
              ]}
              value={digit}
              onChangeText={(value) => handleCodeChange(value, index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
              keyboardType="number-pad"
              maxLength={6}
              selectTextOnFocus
            />
          ))}
        </View>

        {error ? (
          <Text variant="caption" style={styles.errorText}>
            {error}
          </Text>
        ) : null}

        <Button
          title="Se connecter"
          onPress={handleLogin}
          loading={isLoading}
          disabled={isLoading || code.some((d) => !d)}
          fullWidth
          style={styles.loginButton}
        />

        <Text variant="caption" style={styles.hint}>
          Code de test: 111111
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    marginTop: 8,
    marginLeft: 24,
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  logo: {
    width: 180,
    height: 50,
  },
  header: {
    marginBottom: 40,
  },
  subtitle: {
    color: '#6b7280',
    marginTop: 8,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  codeInput: {
    flex: 1,
    height: 56,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    color: '#1a1a1a',
  },
  codeInputFilled: {
    borderColor: '#F5C400',
  },
  codeInputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  loginButton: {
    marginTop: 8,
  },
  hint: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 24,
  },
});
