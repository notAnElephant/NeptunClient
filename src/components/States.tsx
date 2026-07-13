import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/theme';
import { hu } from '@/i18n/hu';

export function LoadingState() { return <View style={styles.state}><ActivityIndicator color={colors.blue} size="large" /><Text style={styles.muted}>Betöltés…</Text></View>; }
export function EmptyState({ message = hu.empty }: { message?: string }) { return <View style={styles.state}><Ionicons name="file-tray-outline" size={34} color={colors.muted} /><Text style={styles.muted}>{message}</Text></View>; }
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return <View style={styles.state}><Ionicons name="alert-circle-outline" size={36} color={colors.danger} /><Text style={styles.error}>{error instanceof Error ? error.message : hu.incompatible}</Text>{onRetry ? <Pressable accessibilityRole="button" style={styles.retry} onPress={onRetry}><Text style={styles.retryText}>{hu.retry}</Text></Pressable> : null}</View>;
}
export function CachedNotice({ savedAt }: { savedAt: string }) { return <View style={styles.notice}><Ionicons name="cloud-offline-outline" size={18} color={colors.warning} /><Text style={styles.noticeText}>{hu.offline} Mentés: {new Date(savedAt).toLocaleString('hu-HU')}</Text></View>; }

const styles = StyleSheet.create({
  state: { minHeight: 260, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg },
  muted: { color: colors.muted, fontSize: 16, textAlign: 'center' },
  error: { color: colors.text, fontSize: 16, lineHeight: 23, textAlign: 'center' },
  retry: { backgroundColor: colors.blue, paddingHorizontal: spacing.lg, paddingVertical: 12, borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '700' },
  notice: { flexDirection: 'row', gap: spacing.sm, backgroundColor: '#FFF6E5', padding: 12, borderRadius: 8, marginBottom: spacing.md },
  noticeText: { flex: 1, color: colors.warning, fontSize: 13, lineHeight: 18 },
});
