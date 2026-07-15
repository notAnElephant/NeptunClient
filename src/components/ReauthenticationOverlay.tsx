import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '@/state/SessionContext';
import { colors, radius, spacing } from '@/theme';

export function ReauthenticationOverlay() {
  const { reauthentication, beginManualReauthentication } = useSession();
  if (reauthentication.state === 'idle') return null;
  const loading = reauthentication.state === 'loading';
  return <Modal transparent animationType="fade" visible onRequestClose={() => undefined}>
    <View style={styles.backdrop} accessibilityViewIsModal>
      <View style={styles.card}>
        {loading ? <ActivityIndicator color={colors.blue} size="large" /> : <Ionicons name="lock-closed-outline" size={38} color={colors.navy} />}
        <Text accessibilityRole="header" style={styles.title}>{loading ? 'Munkamenet helyreállítása' : 'Újra be kell jelentkezned'}</Text>
        <Text style={styles.message}>{loading ? 'A Neptun-kapcsolat megújítása folyamatban…' : reauthentication.message}</Text>
        {!loading ? <Pressable accessibilityRole="button" style={styles.button} onPress={beginManualReauthentication}><Text style={styles.buttonText}>Újra bejelentkezés</Text></Pressable> : null}
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(6, 20, 77, 0.38)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: { width: '100%', maxWidth: 420, backgroundColor: '#fff', borderRadius: radius.md, padding: spacing.xl, alignItems: 'center', gap: spacing.md },
  title: { color: colors.navy, fontSize: 21, fontWeight: '700', textAlign: 'center' },
  message: { color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  button: { alignSelf: 'stretch', minHeight: 50, marginTop: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
