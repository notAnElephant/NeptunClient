import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { DataRow } from '@/components/DataRow';
import { CachedNotice } from '@/components/States';
import { useCalendar, useExams, useStudentProfile, useUnreadCount } from '@/data/queries';
import { greetingFor } from '@/data/greeting';
import { useSession } from '@/state/SessionContext';
import { dateTime } from '@/components/Format';
import { colors, spacing } from '@/theme';

export default function HomeScreen() {
  const { session } = useSession();
  const profile = useStudentProfile();
  const calendar = useCalendar(); const exams = useExams(); const unread = useUnreadCount();
  const upcomingEvent = useMemo(() => calendar.data?.data.filter((event) => new Date(event.endsAt) >= new Date()).sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0], [calendar.data]);
  const upcomingExam = useMemo(() => exams.data?.data.filter((exam) => new Date(exam.startsAt) >= new Date()).sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0], [exams.data]);
  const refresh = () => Promise.all([calendar.refetch(), exams.refetch(), unread.refetch()]);
  const cachedAt = calendar.data?.cachedAt ?? exams.data?.cachedAt;
  return <Screen title={greetingFor(new Date(), profile.data?.name || session?.userName || '')} action={<Pressable accessibilityLabel="Értesítések"><Ionicons name="notifications-outline" size={25} color={colors.navy} /></Pressable>} refreshing={calendar.isRefetching || exams.isRefetching || unread.isRefetching} onRefresh={refresh}>
    <Text style={styles.today}>Ma</Text>{cachedAt ? <CachedNotice savedAt={cachedAt} /> : null}
    <DataRow icon="calendar-outline" label="Következő esemény" value={upcomingEvent?.title ?? 'Nincs közelgő esemény'} detail={upcomingEvent ? `${dateTime.format(new Date(upcomingEvent.startsAt))}${upcomingEvent.location ? ` · ${upcomingEvent.location}` : ''}` : undefined} onPress={() => router.push('/(tabs)/calendar')} />
    <DataRow icon="school-outline" label="Következő vizsga" value={upcomingExam?.subject ?? 'Nincs közelgő vizsga'} detail={upcomingExam ? dateTime.format(new Date(upcomingExam.startsAt)) : undefined} onPress={() => router.push('/exams')} />
    <DataRow icon="mail-outline" label="Olvasatlan üzenetek" value={unread.data === undefined ? '—' : String(unread.data)} onPress={() => router.push('/(tabs)/messages')} />
    <Text style={styles.updated}>Legutóbb frissítve: {new Date().toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}</Text>
  </Screen>;
}
const styles = StyleSheet.create({ today: { color: colors.blue, fontSize: 20, fontWeight: '700', paddingBottom: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border }, updated: { color: colors.muted, fontSize: 13, fontStyle: 'italic', textAlign: 'right', marginTop: spacing.lg } });
