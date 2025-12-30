import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/lib/AuthContext';

interface MenuItem {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  route?: string;
  action?: () => void;
  variant?: 'default' | 'danger';
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

function PageHeader({ title }: { title: string }) {
  return (
    <View style={styles.header}>
      <View style={styles.menuButton}>
        <Ionicons name="menu" size={20} color="#5c5c5c" />
      </View>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

function UserProfileHeader({ name, lastName, rating }: { name: string; lastName: string; rating: number }) {
  return (
    <View style={styles.profileHeader}>
      <View style={styles.profileLeft}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{name.charAt(0)}</Text>
          </View>
          <View style={styles.onlineIndicator} />
        </View>
        <View>
          <Text style={styles.profileName}>{name}</Text>
          <Text style={styles.profileLastName}>{lastName}</Text>
        </View>
      </View>
      <View style={styles.ratingContainer}>
        <View style={styles.ratingBar} />
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>{rating}</Text>
          <Ionicons name="star" size={20} color="#FFFFFF" />
        </View>
      </View>
    </View>
  );
}

function ProfileMenuItem({ item, onPress }: { item: MenuItem; onPress: () => void }) {
  const isDanger = item.variant === 'danger';
  
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemContent}>
        <View style={styles.menuItemLeft}>
          <View style={[styles.menuIcon, isDanger && styles.menuIconDanger]}>
            <Ionicons 
              name={item.icon} 
              size={20} 
              color={isDanger ? '#DC2626' : '#5c5c5c'} 
            />
          </View>
          <Text style={[styles.menuItemLabel, isDanger && styles.menuItemLabelDanger]}>
            {item.title}
          </Text>
        </View>
        <Ionicons 
          name="chevron-forward" 
          size={20} 
          color={isDanger ? '#DC2626' : '#5c5c5c'} 
        />
      </View>
    </TouchableOpacity>
  );
}

export default function ProfilScreen() {
  const router = useRouter();
  const { client, logout } = useAuth();

  const menuSections: MenuSection[] = [
    {
      title: 'Mon compte',
      items: [
        { id: 'info', title: 'Informations personnelles', icon: 'person-outline', route: '/(client)/info-perso' },
        { id: 'wallet', title: 'Moyens de paiement', icon: 'card-outline', route: '/(client)/wallet' },
      ],
    },
    {
      title: 'Paramètres',
      items: [
        { id: 'notifications', title: 'Notifications', icon: 'notifications-outline', route: '/(client)/notifications' },
        { id: 'privacy', title: 'Confidentialité et sécurité', icon: 'shield-outline', route: '/(client)/confidentialite' },
      ],
    },
    {
      title: 'Aide',
      items: [
        { id: 'help', title: "Centre d'aide", icon: 'help-circle-outline', route: '/(client)/aide' },
      ],
    },
  ];

  const logoutItem: MenuItem = {
    id: 'logout',
    title: 'Déconnexion',
    icon: 'log-out-outline',
    variant: 'danger',
    action: logout,
  };

  const handleMenuPress = (item: MenuItem) => {
    if (item.route) {
      router.push(item.route as any);
    } else if (item.action) {
      item.action();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <PageHeader title="Mon profil" />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <UserProfileHeader 
          name={client?.firstName || 'Client'}
          lastName={client?.lastName || ''}
          rating={5}
        />

        <View style={styles.menuContainer}>
          {menuSections.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.items.map((item) => (
                <ProfileMenuItem
                  key={item.id}
                  item={item}
                  onPress={() => handleMenuPress(item)}
                />
              ))}
            </View>
          ))}

          <ProfileMenuItem
            item={logoutItem}
            onPress={() => handleMenuPress(logoutItem)}
          />
        </View>

        <Text style={styles.version}>Version 2.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffdf6d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#393939',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 76,
    height: 74,
    borderRadius: 38,
    backgroundColor: '#F5C400',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#393939',
    lineHeight: 28,
  },
  profileLastName: {
    fontSize: 26,
    fontWeight: '400',
    color: '#393939',
    lineHeight: 28,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingBar: {
    width: 11,
    height: 67,
    borderRadius: 4,
    backgroundColor: '#6CF400',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffdf6d',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  ratingText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  menuContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#343434',
    marginBottom: 12,
  },
  menuItem: {
    backgroundColor: '#f6f6f6',
    borderRadius: 10,
    marginBottom: 8,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffdf6d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIconDanger: {
    backgroundColor: '#FEE2E2',
  },
  menuItemLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#5c5c5c',
  },
  menuItemLabelDanger: {
    color: '#DC2626',
  },
  version: {
    textAlign: 'center',
    fontSize: 14,
    color: '#8c8c8c',
    marginTop: 24,
  },
});
