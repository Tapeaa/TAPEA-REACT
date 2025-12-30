import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ClientLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#F5C400',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#e5e7eb',
          borderTopWidth: 1,
          height: 88,
          paddingBottom: 30,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home-sharp" : "home-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="commandes"
        options={{
          title: 'Courses',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "time-sharp" : "time-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "card-sharp" : "card-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person-circle-sharp" : "person-circle-outline"} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="commande-options"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="cartes-bancaires"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="info-perso"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="tarifs"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="aide"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="support"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
