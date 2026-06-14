import { Stack } from 'expo-router';

export default function ModulesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
  );
}
