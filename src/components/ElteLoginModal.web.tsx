import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';

interface ElteLoginModalProps {
  visible: boolean;
  onCancel(): void;
  onGuid(guid: string): void;
  onError(message: string): void;
}

export function ElteLoginModal({ visible, onCancel }: ElteLoginModalProps) {
  if (!visible) return null;
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>ELTE bejelentkezés</Text>
        <Text style={styles.message}>Az ELTE biztonságos bejelentkezése jelenleg az Android- és iOS-alkalmazásban használható.</Text>
        <Pressable accessibilityRole="button" onPress={onCancel} style={styles.button}><Text style={styles.buttonText}>Bezárás</Text></Pressable>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: 'rgba(10, 24, 55, 0.45)' },
  card: { width: '100%', maxWidth: 420, borderRadius: radius.md, padding: spacing.xl, backgroundColor: '#fff' },
  title: { color: colors.navy, fontSize: 24, fontWeight: '700' },
  message: { color: colors.text, fontSize: 16, lineHeight: 23, marginTop: spacing.md },
  button: { alignSelf: 'flex-end', marginTop: spacing.xl, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  buttonText: { color: colors.blue, fontSize: 16, fontWeight: '700' },
});
