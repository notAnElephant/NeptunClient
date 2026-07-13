import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/theme';

interface DataRowProps { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string; detail?: string; onPress?: () => void; accent?: string }

export function DataRow({ icon, label, value, detail, onPress, accent = colors.blue }: DataRowProps) {
  const content = <><View style={styles.icon}><Ionicons name={icon} size={28} color={accent} /></View><View style={styles.body}><Text style={styles.label}>{label}</Text>{value ? <Text style={styles.value}>{value}</Text> : null}{detail ? <Text style={styles.detail}>{detail}</Text> : null}</View>{onPress ? <Ionicons name="chevron-forward" size={20} color={colors.muted} /> : null}</>;
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>{content}</Pressable> : <View style={styles.row}>{content}</View>;
}

const styles = StyleSheet.create({
  row: { minHeight: 96, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: spacing.md },
  pressed: { opacity: 0.55 }, icon: { width: 40, alignItems: 'center' }, body: { flex: 1, gap: 3 },
  label: { color: colors.navy, fontSize: 17, fontWeight: '700' }, value: { color: colors.text, fontSize: 16 }, detail: { color: colors.muted, fontSize: 14, lineHeight: 20 },
});
