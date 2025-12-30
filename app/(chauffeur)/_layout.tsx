import { Stack } from 'expo-router';

export default function ChauffeurLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="index" />
      <Stack.Screen name="course-en-cours" />
      <Stack.Screen name="courses" />
      <Stack.Screen name="gains" />
      <Stack.Screen name="profil" />
    </Stack>
  );
}
