import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/theme';

export function AppErrorFallback() {
  return <View accessibilityRole="alert" style={styles.container}>
    <Text style={styles.title}>Váratlan hiba történt</Text>
    <Text style={styles.message}>A hibát rögzítettük. Zárd be, majd nyisd meg újra az alkalmazást.</Text>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.background },
  title: { color: colors.navy, fontSize: 26, fontWeight: '700', marginBottom: spacing.sm },
  message: { color: colors.muted, fontSize: 16, lineHeight: 23 },
});
