import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { CachedNotice, EmptyState, ErrorState, LoadingState } from '@/components/States';
import { useExams } from '@/data/queries';
import { dateTime } from '@/components/Format';
import { colors, spacing } from '@/theme';

export default function ExamsScreen() {
  const query = useExams();
  const grouped = useMemo(() => { const now = new Date(); const exams = query.data?.data ?? []; return { upcoming: exams.filter((item) => new Date(item.startsAt) >= now).sort((a, b) => a.startsAt.localeCompare(b.startsAt)), past: exams.filter((item) => new Date(item.startsAt) < now).sort((a, b) => b.startsAt.localeCompare(a.startsAt)) }; }, [query.data]);
  return <Screen title="Vizsgák" action={<Pressable onPress={() => router.back()} accessibilityLabel="Vissza"><Ionicons name="close" size={26} color={colors.navy} /></Pressable>} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
    {query.data?.cachedAt ? <CachedNotice savedAt={query.data.cachedAt} /> : null}{query.isLoading ? <LoadingState /> : query.error ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : !grouped.upcoming.length && !grouped.past.length ? <EmptyState message="Nincs megjeleníthető vizsga." /> : <><Text style={styles.section}>Közelgő</Text>{grouped.upcoming.map((exam) => <ExamRow key={exam.id} exam={exam} />)}<Text style={styles.section}>Korábbi</Text>{grouped.past.map((exam) => <ExamRow key={exam.id} exam={exam} />)}</>}
  </Screen>;
}
function ExamRow({ exam }: { exam: { id: string; subject: string; startsAt: string; location?: string; result?: string; status?: string } }) { return <View style={styles.row}><View style={styles.dateBox}><Text style={styles.day}>{new Date(exam.startsAt).getDate()}</Text><Text style={styles.month}>{new Intl.DateTimeFormat('hu-HU', { month: 'short' }).format(new Date(exam.startsAt))}</Text></View><View style={styles.body}><Text style={styles.subject}>{exam.subject}</Text><Text style={styles.detail}>{dateTime.format(new Date(exam.startsAt))}{exam.location ? ` · ${exam.location}` : ''}</Text>{exam.status || exam.result ? <Text style={styles.status}>{exam.result || exam.status}</Text> : null}</View></View>; }
const styles = StyleSheet.create({ section: { color: colors.blue, fontSize: 18, fontWeight: '700', marginTop: spacing.lg, paddingBottom: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border }, row: { minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingVertical: 12 }, dateBox: { width: 46, alignItems: 'center' }, day: { color: colors.navy, fontSize: 24, fontWeight: '700' }, month: { color: colors.muted, fontSize: 12, textTransform: 'uppercase' }, body: { flex: 1, gap: 4 }, subject: { color: colors.navy, fontSize: 16, fontWeight: '700' }, detail: { color: colors.muted, fontSize: 13 }, status: { color: colors.blue, fontSize: 13, fontWeight: '600' } });
