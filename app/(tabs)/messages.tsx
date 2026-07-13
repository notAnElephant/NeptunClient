import { useDeferredValue, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { useMessages } from '@/data/queries';
import { colors, spacing } from '@/theme';

export default function MessagesScreen() {
  const [search, setSearch] = useState(''); const deferredSearch = useDeferredValue(search); const query = useMessages(deferredSearch);
  const unread = query.data?.items.filter((message) => message.isUnread).length ?? 0;
  return <Screen title="Üzenetek" refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
    <View style={styles.search}><Ionicons name="search" size={20} color={colors.muted} /><TextInput value={search} onChangeText={setSearch} style={styles.searchInput} placeholder="Keresés" placeholderTextColor={colors.muted} /></View>
    <Text style={styles.unread}>{unread} olvasatlan</Text>
    {query.isLoading ? <LoadingState /> : query.error ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : !query.data?.items.length ? <EmptyState /> : query.data.items.map((message) => <Pressable key={message.id} style={styles.row} onPress={() => router.push({ pathname: '/message/[id]', params: { id: message.id } })}>{message.isUnread ? <View style={styles.dot} /> : <View style={styles.dotSpace} />}<View style={styles.body}><View style={styles.rowTop}><Text numberOfLines={1} style={[styles.subject, message.isUnread && styles.bold]}>{message.subject}</Text><Text style={styles.date}>{new Date(message.sentAt).toLocaleDateString('hu-HU')}</Text></View><Text numberOfLines={1} style={[styles.sender, message.isUnread && styles.bold]}>{message.sender}</Text>{message.preview ? <Text numberOfLines={2} style={styles.preview}>{message.preview}</Text> : null}</View><Ionicons name="chevron-forward" size={19} color={colors.muted} /></Pressable>)}
  </Screen>;
}
const styles = StyleSheet.create({ search: { height: 44, backgroundColor: '#F2F4F7', borderRadius: 9, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md }, searchInput: { flex: 1, fontSize: 16, color: colors.text }, unread: { color: colors.blue, fontSize: 17, fontWeight: '700', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border }, row: { minHeight: 100, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingVertical: 14 }, dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.blue }, dotSpace: { width: 9 }, body: { flex: 1, gap: 3 }, rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 }, subject: { flex: 1, color: colors.text, fontSize: 16 }, bold: { fontWeight: '700', color: colors.navy }, date: { color: colors.muted, fontSize: 12 }, sender: { color: colors.text, fontSize: 14 }, preview: { color: colors.muted, fontSize: 13, lineHeight: 18 } });
