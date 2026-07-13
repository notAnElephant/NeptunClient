import type { PropsWithChildren, ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';

interface ScreenProps extends PropsWithChildren { title?: string; action?: ReactNode; refreshing?: boolean; onRefresh?: () => void }

export function Screen({ title, action, refreshing = false, onRefresh, children }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} /> : undefined}>
        {title ? <View style={styles.header}><Text accessibilityRole="header" style={styles.title}>{title}</Text>{action}</View> : null}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  header: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.navy, fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.5 },
});
