import { useMemo, useState } from 'react';
import { usePostHog } from 'posthog-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, LocaleConfig, type DateData } from 'react-native-calendars';
import { Screen } from '@/components/Screen';
import { CachedNotice, EmptyState, ErrorState, LoadingState } from '@/components/States';
import { dateFromKey, localDateKey } from '@/data/date';
import { useCalendar } from '@/data/queries';
import { colors, radius, spacing } from '@/theme';
import { day, time } from '@/components/Format';

LocaleConfig.locales.hu = {
  monthNames: ['január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december'],
  monthNamesShort: ['jan.', 'febr.', 'márc.', 'ápr.', 'máj.', 'jún.', 'júl.', 'aug.', 'szept.', 'okt.', 'nov.', 'dec.'],
  dayNames: ['vasárnap', 'hétfő', 'kedd', 'szerda', 'csütörtök', 'péntek', 'szombat'],
  dayNamesShort: ['V', 'H', 'K', 'Sze', 'Cs', 'P', 'Szo'],
  today: 'Ma',
};
LocaleConfig.defaultLocale = 'hu';

const typeColors = { course: '#0867E8', exam: '#7B3FF2', task: '#00875A', other: '#667085' } as const;
const calendarTheme = {
  calendarBackground: colors.background,
  monthTextColor: colors.navy,
  textSectionTitleColor: colors.muted,
  dayTextColor: colors.text,
  textDisabledColor: '#A6ADBC',
  todayTextColor: colors.blue,
  selectedDayBackgroundColor: colors.blue,
  selectedDayTextColor: '#FFFFFF',
  arrowColor: colors.blue,
  textMonthFontSize: 18,
  textMonthFontWeight: '700' as const,
  textDayFontSize: 15,
  textDayHeaderFontSize: 12,
  dotStyle: { width: 5, height: 5, borderRadius: 3, marginTop: 1 },
};

export default function CalendarScreen() {
  const posthog = usePostHog();
  const today = localDateKey(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [visibleMonth, setVisibleMonth] = useState(today);
  const selected = dateFromKey(selectedDate);
  const query = useCalendar(dateFromKey(visibleMonth));
  const markedDates = useMemo(() => {
    const marks: Record<string, { dots?: { key: string; color: string; selectedDotColor: string }[]; selected?: boolean; selectedColor?: string }> = {};
    for (const event of query.data?.data ?? []) {
      const date = localDateKey(new Date(event.startsAt));
      const dots = marks[date]?.dots ?? [];
      if (!dots.some((dot) => dot.key === event.type)) dots.push({ key: event.type, color: typeColors[event.type], selectedDotColor: '#FFFFFF' });
      marks[date] = { ...marks[date], dots };
    }
    marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: colors.blue };
    return marks;
  }, [query.data, selectedDate]);
  const events = useMemo(() => query.data?.data.filter((event) => localDateKey(new Date(event.startsAt)) === selectedDate).sort((a, b) => a.startsAt.localeCompare(b.startsAt)) ?? [], [query.data, selectedDate]);
  const selectDay = (date: DateData) => {
    setSelectedDate(date.dateString);
    posthog.capture('calendar_day_selected', { selected_date: date.dateString });
  };
  const changeMonth = (date: DateData) => {
    setVisibleMonth(date.dateString);
    setSelectedDate(date.dateString);
  };

  return <Screen title="Naptár" action={<Ionicons name="calendar-outline" size={26} color={colors.navy} />} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
    <Calendar testID="month-calendar" current={visibleMonth} firstDay={1} markedDates={markedDates} markingType="multi-dot" onDayPress={selectDay} onMonthChange={changeMonth} enableSwipeMonths showSixWeeks renderArrow={(direction: 'left' | 'right') => <Ionicons name={direction === 'left' ? 'chevron-back' : 'chevron-forward'} size={22} color={colors.blue} />} style={styles.calendar} theme={calendarTheme} />
    <Text style={styles.dateTitle}>{day.format(selected)}</Text>{query.data?.cachedAt ? <CachedNotice savedAt={query.data.cachedAt} /> : null}
    {query.isLoading ? <LoadingState /> : query.error ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : !events.length ? <EmptyState message="Erre a napra nincs esemény." /> : events.map((event) => <View key={event.id} style={styles.event}><View style={[styles.rail, { backgroundColor: typeColors[event.type] }]} /><Text style={styles.eventTime}>{time.format(new Date(event.startsAt))}</Text><View style={styles.eventBody}><Text style={styles.eventTitle}>{event.title}</Text><Text style={styles.eventDetail}>{time.format(new Date(event.startsAt))}–{time.format(new Date(event.endsAt))}{event.location ? ` · ${event.location}` : ''}</Text>{event.description ? <Text numberOfLines={2} style={styles.eventDescription}>{event.description}</Text> : null}</View></View>)}
  </Screen>;
}
const styles = StyleSheet.create({ calendar: { marginHorizontal: -spacing.sm, paddingBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden' }, dateTitle: { color: colors.blue, fontSize: 17, fontWeight: '700', textTransform: 'capitalize', marginTop: spacing.md, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border }, event: { minHeight: 92, flexDirection: 'row', alignItems: 'stretch', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingVertical: 14 }, rail: { width: 3, borderRadius: 2, marginRight: 10 }, eventTime: { width: 48, color: colors.muted, fontSize: 13 }, eventBody: { flex: 1, gap: 4 }, eventTitle: { color: colors.navy, fontSize: 16, fontWeight: '700' }, eventDetail: { color: colors.muted, fontSize: 13 }, eventDescription: { color: colors.muted, fontSize: 13, lineHeight: 18 } });
