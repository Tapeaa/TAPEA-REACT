# TĀPE'A - Application Mobile React Native

## Overview
TĀPE'A est une application de taxi et VTC pour la Polynésie française, convertie d'une application web React vers React Native avec Expo.

## État actuel
- **Plateforme**: React Native + Expo SDK 54
- **Serveur**: Expo Dev Server sur port 5000
- **Status**: Application fonctionnelle avec écran d'accueil, authentification, et navigation

## Stack technique
- **Framework**: React Native avec Expo
- **Navigation**: Expo Router (file-based routing)
- **State Management**: React Query (@tanstack/react-query)
- **Temps réel**: Socket.io-client
- **Stockage sécurisé**: expo-secure-store
- **Icônes**: @expo/vector-icons (Ionicons)
- **Paiement**: Stripe (à configurer)
- **Cartes**: Google Maps (à configurer)

## Structure du projet
```
app/
├── _layout.tsx           # Layout principal avec providers
├── index.tsx             # Redirection vers welcome
├── (auth)/               # Écrans d'authentification
│   ├── _layout.tsx
│   ├── welcome.tsx       # Page d'accueil
│   ├── login.tsx         # Connexion client
│   ├── register.tsx      # Inscription client
│   ├── verify.tsx        # Vérification OTP
│   ├── forgot-password.tsx
│   └── reset-password.tsx
├── (client)/             # Interface client
│   ├── _layout.tsx       # Navigation par onglets
│   ├── index.tsx         # Accueil client (options de course)
│   ├── commandes.tsx     # Historique des courses
│   ├── wallet.tsx        # Portefeuille
│   ├── profil.tsx        # Profil utilisateur
│   ├── commande-options.tsx # Options de réservation
│   ├── cartes-bancaires.tsx # Gestion des cartes
│   ├── info-perso.tsx    # Informations personnelles
│   ├── tarifs.tsx        # Grille tarifaire
│   ├── aide.tsx          # FAQ et aide
│   └── support.tsx       # Contact support
└── (chauffeur)/          # Interface chauffeur
    ├── _layout.tsx
    ├── login.tsx         # Connexion chauffeur (code 6 chiffres)
    ├── index.tsx         # Tableau de bord chauffeur
    ├── active-ride.tsx   # Course en cours
    ├── history.tsx       # Historique des courses
    ├── earnings.tsx      # Revenus
    └── profile.tsx       # Profil chauffeur

components/ui/            # Composants réutilisables
├── Button.tsx
├── Input.tsx
├── Card.tsx
├── Text.tsx
└── PhoneInput.tsx

lib/                      # Utilitaires
├── types.ts              # Types et constantes (tarifs, options)
├── api.ts                # Fonctions API avec SecureStore
├── socket.ts             # Configuration Socket.io
├── queryClient.ts        # React Query client
└── AuthContext.tsx       # Contexte d'authentification
```

## Configuration
### Variables d'environnement
- `EXPO_PUBLIC_API_URL`: URL de l'API backend

### Codes de test
- **Client**: N'importe quel numéro +689
- **Chauffeur**: Code `111111`

## Tarification
- **Course immédiate/Réservation**: 2300 XPF base + 150 XPF/km
- **Tour de l'île**: 30000 XPF forfait
- **Commission chauffeur**: 80%
- **Suppléments**: Bagages (500 XPF), Équipements (300 XPF)

## À configurer
1. URL de l'API backend (EXPO_PUBLIC_API_URL)
2. Clés Stripe pour les paiements
3. Clé API Google Maps pour la géolocalisation
4. Notifications push (Firebase ou Expo Push)

## Dernières modifications
- 30/12/2025: Conversion complète vers React Native/Expo
- Structure de navigation avec Expo Router
- Composants UI adaptés pour mobile
- Intégration Socket.io pour temps réel
- Écrans client et chauffeur complets
