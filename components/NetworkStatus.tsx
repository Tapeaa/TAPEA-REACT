import { useEffect, useState } from 'react';
import { View, StyleSheet, Platform, AppState, AppStateStatus } from 'react-native';
import { Text } from './ui/Text';
import { Ionicons } from '@expo/vector-icons';

export function NetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [wasOffline, setWasOffline] = useState<boolean>(false);

  useEffect(() => {
    // Pour le web, on utilise l'API navigator
    if (Platform.OS === 'web') {
      const updateOnlineStatus = () => {
        const connected = navigator.onLine;
        setIsConnected(connected);
        if (!connected) {
          setWasOffline(true);
        } else if (wasOffline) {
          // Récemment reconnecté, on peut afficher un message de succès
          setTimeout(() => setWasOffline(false), 3000);
        }
      };

      window.addEventListener('online', updateOnlineStatus);
      window.addEventListener('offline', updateOnlineStatus);
      updateOnlineStatus();

      return () => {
        window.removeEventListener('online', updateOnlineStatus);
        window.removeEventListener('offline', updateOnlineStatus);
      };
    } else {
      // Pour mobile, on détecte via un ping périodique
      let pingInterval: NodeJS.Timeout | null = null;
      
      const checkConnection = async () => {
        try {
          // Ping simple vers un serveur fiable
          const response = await fetch('https://www.google.com/favicon.ico', {
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'no-cache',
          });
          setIsConnected(true);
          if (wasOffline) {
            setTimeout(() => setWasOffline(false), 3000);
          }
        } catch (error) {
          setIsConnected(false);
          setWasOffline(true);
        }
      };

      // Vérifier immédiatement
      checkConnection();

      // Vérifier toutes les 5 secondes
      pingInterval = setInterval(checkConnection, 5000);

      // Vérifier aussi quand l'app revient au premier plan
      const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          checkConnection();
        }
      });

      return () => {
        if (pingInterval) {
          clearInterval(pingInterval);
        }
        subscription.remove();
      };
    }
  }, [wasOffline]);

  // Afficher un message de reconnexion si on vient de se reconnecter
  if (isConnected && wasOffline) {
    return (
      <View style={[styles.container, styles.reconnectedContainer]}>
        <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
        <Text style={styles.text}>Connexion rétablie</Text>
      </View>
    );
  }

  // Ne rien afficher si connecté et pas de reconnexion récente
  if (isConnected) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Ionicons name="warning" size={16} color="#FFFFFF" />
      <Text style={styles.text}>Pas de connexion réseau</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    zIndex: 9999,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  reconnectedContainer: {
    backgroundColor: '#22C55E',
  },
});
