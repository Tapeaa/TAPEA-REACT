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
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="commandes"
        options={{
          title: 'Courses',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Portefeuille',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
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
        name="itinerary"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="course-en-cours"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="recherche-chauffeur"
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
