import { Modal, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { DiagnosticConsent } from '@/data/diagnosticPreferences';
import { colors, radius, spacing } from '@/theme';

interface DiagnosticPrivacyModalProps {
  visible: boolean;
  mode: 'failure' | 'settings';
  consent: DiagnosticConsent;
  probeAvailable?: boolean;
  onGrant(): void | Promise<void>;
  onDeny(): void | Promise<void>;
  onClose(): void;
  onStartProbe?(): void;
}

export function DiagnosticPrivacyModal({
  visible,
  mode,
  consent,
  probeAvailable = false,
  onGrant,
  onDeny,
  onClose,
  onStartProbe,
}: DiagnosticPrivacyModalProps) {
  const failureNeedsDecision = mode === 'failure' && consent === 'unknown';
  const nativeProbe = Platform.OS !== 'web' && probeAvailable;

  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>Adatvédelem</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Bezárás" onPress={onClose} hitSlop={12} style={styles.headerSpacer}>
          <Ionicons name="close" size={25} color={colors.navy} />
        </Pressable>
      </View>
      <View style={styles.content}>
        <View style={styles.icon}><Ionicons name="shield-checkmark-outline" size={34} color={colors.blue} /></View>
        <Text accessibilityRole="header" style={styles.title}>
          {mode === 'failure' ? 'Segítesz megérteni ezt a bejelentkezési hibát?' : 'Névtelen kompatibilitási diagnosztika'}
        </Text>
        <Text style={styles.body}>
          Csak a kérés felépítését küldjük el: az intézményt, a használt végpont gazdagépét és útvonalát, az állapotkódot, az időtartamot, valamint a válasz mezőneveinek és típusainak rövid lenyomatát.
        </Text>
        <View style={styles.neverBox}>
          <Text style={styles.neverTitle}>Soha nem küldjük el</Text>
          <Text style={styles.neverText}>a Neptun-kódot, jelszót, tokeneket, sütiket, kérés- vagy választestet, HTML-t, URL-paraméterértékeket vagy az oldalon kitöltött mezőket.</Text>
        </View>

        {mode === 'settings' ? <>
          <View style={styles.settingRow}>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Jövőbeli diagnosztikák</Text>
              <Text style={styles.settingDetail}>A kikapcsolás a későbbi bejelentkezési próbákra érvényes.</Text>
            </View>
            <Switch
              accessibilityLabel="Névtelen kompatibilitási diagnosztika"
              value={consent === 'granted'}
              onValueChange={(enabled) => { void (enabled ? onGrant() : onDeny()); }}
              trackColor={{ false: colors.border, true: colors.blue }}
              thumbColor="#fff"
            />
          </View>
          <Text style={styles.status}>Állapot: {consent === 'granted' ? 'engedélyezve' : consent === 'denied' ? 'kikapcsolva' : 'még nem választottál'}</Text>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.primary}><Text style={styles.primaryText}>Kész</Text></Pressable>
        </> : failureNeedsDecision ? <>
          <Text style={styles.body}>Az elküldés egyszeri döntésként engedélyezi a jövőbeli, ugyanilyen adatvédelmi szintű diagnosztikákat is. Később bármikor kikapcsolhatod.</Text>
          <Pressable accessibilityRole="button" onPress={() => { void onGrant(); }} style={styles.primary}><Text style={styles.primaryText}>Névtelen diagnosztika küldése</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => { void onDeny(); }} style={styles.secondary}><Text style={styles.secondaryText}>Ne küldje el</Text></Pressable>
        </> : <>
          <Text style={styles.sent}>A diagnosztikát eltároltuk küldésre.</Text>
          {nativeProbe ? <Pressable accessibilityRole="button" onPress={onStartProbe} style={styles.primary}><Text style={styles.primaryText}>Kompatibilitási mód indítása</Text></Pressable> : null}
          {Platform.OS === 'web' ? <Text style={styles.body}>A webes változat nem nyit külső bejelentkezési próbát; csak a közvetlen kérés névtelen diagnosztikája került elküldésre.</Text> : !probeAvailable ? <Text style={styles.body}>Ehhez az intézményhez nincs biztonságosan megnyitható HTTPS-cím.</Text> : null}
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.secondary}><Text style={styles.secondaryText}>Bezárás</Text></Pressable>
        </>}
      </View>
    </SafeAreaView>
  </Modal>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { minHeight: 58, paddingHorizontal: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpacer: { width: 32, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: colors.navy, fontSize: 18, fontWeight: '700' },
  content: { flex: 1, padding: spacing.lg, maxWidth: 560, width: '100%', alignSelf: 'center' },
  icon: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md, marginBottom: spacing.lg },
  title: { color: colors.navy, fontSize: 25, lineHeight: 31, fontWeight: '700', marginBottom: spacing.md },
  body: { color: colors.text, fontSize: 15, lineHeight: 22, marginBottom: spacing.md },
  neverBox: { backgroundColor: '#F4F7FB', borderRadius: radius.sm, padding: spacing.md, marginVertical: spacing.sm },
  neverTitle: { color: colors.navy, fontSize: 15, fontWeight: '700', marginBottom: spacing.xs },
  neverText: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  settingRow: { minHeight: 74, marginTop: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  settingText: { flex: 1 }, settingTitle: { color: colors.text, fontSize: 16, fontWeight: '700' }, settingDetail: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 3 },
  status: { color: colors.muted, fontSize: 13, marginTop: spacing.sm },
  sent: { color: colors.navy, fontSize: 16, fontWeight: '700', marginTop: spacing.lg, marginBottom: spacing.sm },
  primary: { minHeight: 52, borderRadius: radius.sm, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg, paddingHorizontal: spacing.md },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  secondary: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.md },
  secondaryText: { color: colors.blue, fontSize: 15, fontWeight: '600', textAlign: 'center' },
});
