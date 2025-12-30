import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';

export default function ChauffeurCoursesScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text variant="h1">Historique</Text>
      </View>
      <View style={styles.content}>
        <Ionicons name="list-outline" size={64} color="#e5e7eb" />
        <Text variant="h3" style={styles.title}>
          Aucune course
        </Text>
        <Text variant="body" style={styles.text}>
          Votre historique de courses apparaîtra ici
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    marginTop: 16,
    marginBottom: 8,
  },
  text: {
    color: '#6b7280',
    textAlign: 'center',
  },
});
