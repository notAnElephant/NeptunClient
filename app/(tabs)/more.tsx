import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { getInstitution } from '@/data/institutions';
import { clearCache } from '@/data/cache';
import { useSession } from '@/state/SessionContext';
import { colors, spacing } from '@/theme';

function SettingRow({ icon, title, detail, onPress, danger }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail?: string; onPress: () => void; danger?: boolean }) {
  return <Pressable style={styles.row} onPress={onPress}><Ionicons name={icon} size={23} color={danger ? colors.danger : colors.blue} /><View style={styles.body}><Text style={[styles.title, danger && styles.danger]}>{title}</Text>{detail ? <Text style={styles.detail}>{detail}</Text> : null}</View><Ionicons name="chevron-forward" size={19} color={colors.muted} /></Pressable>;
}
export default function MoreScreen() {
  const { session, logout } = useSession(); const institution = session ? getInstitution(session.institutionId) : undefined; const accountKey = session ? `${session.institutionId}:${session.userName}` : '';
  return <Screen title="Továbbiak">
    <View style={styles.account}><View style={styles.avatar}><Ionicons name="person" size={24} color={colors.blue} /></View><View><Text style={styles.accountName}>{session?.userName}</Text><Text style={styles.accountDetail}>{institution?.name}</Text></View></View>
    <Text style={styles.section}>TANULMÁNYOK</Text><SettingRow icon="school-outline" title="Vizsgák" detail="Közelgő és korábbi vizsgák" onPress={() => router.push('/exams')} />
    <Text style={styles.section}>FIÓK ÉS ADATOK</Text><SettingRow icon="swap-horizontal-outline" title="Intézmény vagy fiók váltása" onPress={logout} /><SettingRow icon="trash-outline" title="Gyorsítótár törlése" detail="A mentett naptár- és összefoglaló adatok törlése" onPress={() => clearCache(accountKey)} /><SettingRow icon="shield-checkmark-outline" title="Adatvédelem" detail="A hitelesítési adatok csak ezen az eszközön tárolódnak" onPress={() => {}} /><SettingRow icon="log-out-outline" title="Kijelentkezés" onPress={logout} danger />
    <Text style={styles.version}>Neptun 0.1.0 · Csak olvasási hozzáférés</Text>
  </Screen>;
}
const styles = StyleSheet.create({ account: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border }, avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' }, accountName: { color: colors.navy, fontSize: 18, fontWeight: '700' }, accountDetail: { color: colors.muted, marginTop: 3, maxWidth: 280 }, section: { color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.7, marginTop: spacing.xl, marginBottom: spacing.sm }, row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border }, body: { flex: 1 }, title: { color: colors.text, fontSize: 16, fontWeight: '600' }, danger: { color: colors.danger }, detail: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 3 }, version: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: spacing.xl } });
