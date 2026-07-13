import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useSession } from '@/state/SessionContext';
import { colors } from '@/theme';

export default function Index() {
  const { ready, session } = useSession();
  if (!ready) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.blue} /></View>;
  if (!session) return <Redirect href="/login" />;
  if (!session.activeTrainingId) return <Redirect href="/training" />;
  return <Redirect href="/(tabs)" />;
}
