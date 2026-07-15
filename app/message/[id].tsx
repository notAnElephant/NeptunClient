import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { MessageBody } from '@/components/MessageBody';
import { ErrorState, LoadingState } from '@/components/States';
import { useMessage } from '@/data/queries';
import { dateTime } from '@/components/Format';
import { colors, spacing } from '@/theme';

export default function MessageDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const query = useMessage(id);
  return <Screen title="Üzenet" action={<Pressable onPress={() => router.back()} accessibilityLabel="Vissza"><Ionicons name="close" size={26} color={colors.navy} /></Pressable>}>
    {query.isLoading ? <LoadingState /> : query.error ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : query.data ? <View><Text style={styles.subject}>{query.data.subject}</Text><Text style={styles.sender}>{query.data.sender}</Text><Text style={styles.date}>{dateTime.format(new Date(query.data.sentAt))}</Text><View style={styles.divider} /><MessageBody html={query.data.body} /><Text style={styles.local}>Az üzenet megnyitása csak ezen az eszközön számít olvasottnak.</Text></View> : null}
  </Screen>;
}
const styles = StyleSheet.create({ subject: { color: colors.navy, fontSize: 23, lineHeight: 29, fontWeight: '700', marginTop: spacing.md }, sender: { color: colors.text, fontSize: 16, fontWeight: '600', marginTop: spacing.md }, date: { color: colors.muted, fontSize: 13, marginTop: 4 }, divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.lg }, local: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: spacing.xl } });
