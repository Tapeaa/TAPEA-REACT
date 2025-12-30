import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/AuthContext';

interface MenuItem {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  route?: string;
  action?: () => void;
  color?: string;
}

export default function ProfilScreen() {
  const router = useRouter();
  const { client, logout } = useAuth();

  const menuItems: MenuItem[] = [
    { id: 'info', title: 'Informations personnelles', icon: 'person-outline', route: '/(client)/info-perso' },
    { id: 'wallet', title: 'Portefeuille', icon: 'wallet-outline', route: '/(client)/wallet' },
    { id: 'cards', title: 'Cartes bancaires', icon: 'card-outline', route: '/(client)/cartes-bancaires' },
    { id: 'orders', title: 'Historique des courses', icon: 'list-outline', route: '/(client)/commandes' },
    { id: 'tarifs', title: 'Grille tarifaire', icon: 'pricetag-outline', route: '/(client)/tarifs' },
    { id: 'help', title: 'Aide', icon: 'help-circle-outline', route: '/(client)/aide' },
    { id: 'support', title: 'Support', icon: 'chatbubble-outline', route: '/(client)/support' },
  ];

  const handleMenuPress = (item: MenuItem) => {
    if (item.route) {
      router.push(item.route as any);
    } else if (item.action) {
      item.action();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text variant="h1">Profil</Text>
        </View>

        <Card style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text variant="h2" style={styles.avatarText}>
                {client?.firstName?.charAt(0) || 'U'}
                {client?.lastName?.charAt(0) || ''}
              </Text>
            </View>
          </View>
          <Text variant="h3" style={styles.userName}>
            {client?.firstName} {client?.lastName}
          </Text>
          <Text variant="body" style={styles.userPhone}>
            {client?.phone}
          </Text>
          {client?.email && (
            <Text variant="caption" style={styles.userEmail}>
              {client.email}
            </Text>
          )}
        </Card>

        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => handleMenuPress(item)}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIcon}>
                  <Ionicons name={item.icon} size={22} color="#1a1a1a" />
                </View>
                <Text variant="body">{item.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6b7280" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={logout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={22} color="#EF4444" />
          <Text variant="body" style={styles.logoutText}>
            Se déconnecter
          </Text>
        </TouchableOpacity>

        <Text variant="caption" style={styles.version}>
          TĀPE'A v1.0.0
        </Text>
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
    paddingBottom: 32,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  profileCard: {
    marginHorizontal: 20,
    padding: 24,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F5C400',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#1a1a1a',
  },
  userName: {
    marginBottom: 4,
  },
  userPhone: {
    color: '#6b7280',
  },
  userEmail: {
    color: '#6b7280',
    marginTop: 4,
  },
  menuContainer: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    marginHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
  },
  logoutText: {
    color: '#EF4444',
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    marginTop: 24,
    color: '#6b7280',
  },
});
