import { useMemo, useState } from 'react';
import { usePostHog } from 'posthog-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { CachedNotice, EmptyState, ErrorState, LoadingState } from '@/components/States';
import { useCalendar } from '@/data/queries';
import { colors, spacing } from '@/theme';
import { day, time } from '@/components/Format';

const typeColors = { course: '#0867E8', exam: '#7B3FF2', task: '#00875A', other: '#667085' };

export default function CalendarScreen() {
  const posthog = usePostHog();
  const [selected, setSelected] = useState(new Date()); const query = useCalendar(selected);
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => { const value = new Date(); value.setDate(value.getDate() + index - 2); return value; }), []);
  const events = useMemo(() => query.data?.data.filter((event) => new Date(event.startsAt).toDateString() === selected.toDateString()).sort((a, b) => a.startsAt.localeCompare(b.startsAt)) ?? [], [query.data, selected]);
  return <Screen title="Naptár" action={<Ionicons name="calendar-outline" size={26} color={colors.navy} />} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
    <View style={styles.week}>{days.map((date) => { const active = date.toDateString() === selected.toDateString(); return <Pressable key={date.toISOString()} onPress={() => { setSelected(date); posthog.capture('calendar_day_selected', { selected_date: date.toISOString().split('T')[0] }); }} style={styles.day}><Text style={styles.weekday}>{new Intl.DateTimeFormat('hu-HU', { weekday: 'narrow' }).format(date)}</Text><View style={[styles.dayNumber, active && styles.dayActive]}><Text style={[styles.dayText, active && styles.dayTextActive]}>{date.getDate()}</Text></View></Pressable>; })}</View>
    <Text style={styles.dateTitle}>{day.format(selected)}</Text>{query.data?.cachedAt ? <CachedNotice savedAt={query.data.cachedAt} /> : null}
    {query.isLoading ? <LoadingState /> : query.error ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : !events.length ? <EmptyState message="Erre a napra nincs esemény." /> : events.map((event) => <View key={event.id} style={styles.event}><View style={[styles.rail, { backgroundColor: typeColors[event.type] }]} /><Text style={styles.eventTime}>{time.format(new Date(event.startsAt))}</Text><View style={styles.eventBody}><Text style={styles.eventTitle}>{event.title}</Text><Text style={styles.eventDetail}>{time.format(new Date(event.startsAt))}–{time.format(new Date(event.endsAt))}{event.location ? ` · ${event.location}` : ''}</Text>{event.description ? <Text numberOfLines={2} style={styles.eventDescription}>{event.description}</Text> : null}</View></View>)}
  </Screen>;
}
const styles = StyleSheet.create({ week: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: -6, marginBottom: spacing.md }, day: { width: 42, alignItems: 'center', gap: 6 }, weekday: { color: colors.muted, fontSize: 12 }, dayNumber: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, dayActive: { backgroundColor: colors.blue }, dayText: { color: colors.text, fontSize: 16 }, dayTextActive: { color: '#fff', fontWeight: '700' }, dateTitle: { color: colors.blue, fontSize: 17, fontWeight: '700', textTransform: 'capitalize', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border }, event: { minHeight: 92, flexDirection: 'row', alignItems: 'stretch', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingVertical: 14 }, rail: { width: 3, borderRadius: 2, marginRight: 10 }, eventTime: { width: 48, color: colors.muted, fontSize: 13 }, eventBody: { flex: 1, gap: 4 }, eventTitle: { color: colors.navy, fontSize: 16, fontWeight: '700' }, eventDetail: { color: colors.muted, fontSize: 13 }, eventDescription: { color: colors.muted, fontSize: 13, lineHeight: 18 } });
