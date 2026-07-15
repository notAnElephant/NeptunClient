import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { ErrorState, LoadingState } from '@/components/States';
import { useTrainings } from '@/data/queries';
import { useSession } from '@/state/SessionContext';
import { colors, spacing } from '@/theme';

export default function TrainingScreen() {
  const { change } = useLocalSearchParams<{ change?: string }>();
  const changingTraining = change === '1';
  const { session, selectTraining, logout } = useSession();
  const query = useTrainings();
  if (!session) return <Redirect href="/login" />;
  if (session.activeTrainingId && !changingTraining) return <Redirect href="/(tabs)" />;
  const choose = async (training: Parameters<typeof selectTraining>[0]) => {
    await selectTraining(training);
    router.replace(changingTraining ? '/(tabs)/more' : '/(tabs)');
  };
  return <Screen title="Képzés választása" action={changingTraining ? <Pressable onPress={() => router.back()}><Text style={styles.logout}>Mégse</Text></Pressable> : <Pressable onPress={logout}><Text style={styles.logout}>Kilépés</Text></Pressable>}>
    <Text style={styles.help}>Válaszd ki, melyik képzés adatait szeretnéd látni.</Text>
    {query.isLoading ? <LoadingState /> : query.error ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : query.data?.map((training) => <Pressable key={training.id} style={styles.row} onPress={() => choose(training)}><View style={styles.trainingBody}><Text style={styles.name}>{training.name}</Text>{training.code ? <Text style={styles.detail}>{training.code}{training.faculty ? ` · ${training.faculty}` : ''}</Text> : null}</View>{training.id === session.activeTrainingId ? <Ionicons name="checkmark-circle" size={22} color={colors.blue} /> : <Ionicons name="chevron-forward" size={20} color={colors.muted} />}</Pressable>)}
  </Screen>;
}
const styles = StyleSheet.create({ help: { color: colors.muted, fontSize: 16, lineHeight: 23, marginBottom: spacing.lg }, logout: { color: colors.blue, fontWeight: '600' }, row: { minHeight: 78, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }, trainingBody: { flex: 1 }, name: { color: colors.navy, fontSize: 17, fontWeight: '700' }, detail: { color: colors.muted, marginTop: 4 } });
