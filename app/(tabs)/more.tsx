import { useState } from 'react';
import { usePostHog } from 'posthog-react-native';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { getInstitution } from '@/data/institutions';
import { clearCache } from '@/data/cache';
import { useSession } from '@/state/SessionContext';
import { useStudentProfile } from '@/data/queries';
import { useNickname } from '@/data/nickname';
import { defaultNickname, greetingFor } from '@/data/greeting';
import { colors, radius, spacing } from '@/theme';
import { DiagnosticPrivacyModal } from '@/components/DiagnosticPrivacyModal';

function SettingRow({ icon, title, detail, onPress, danger }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail?: string; onPress: () => void; danger?: boolean }) {
  return <Pressable style={styles.row} onPress={onPress}><Ionicons name={icon} size={23} color={danger ? colors.danger : colors.blue} /><View style={styles.body}><Text style={[styles.title, danger && styles.danger]}>{title}</Text>{detail ? <Text style={styles.detail}>{detail}</Text> : null}</View><Ionicons name="chevron-forward" size={19} color={colors.muted} /></Pressable>;
}
export default function MoreScreen() {
  const posthog = usePostHog();
  const { session, logout, diagnosticConsent, setDiagnosticConsentForFuture } = useSession(); const institution = session ? getInstitution(session.institutionId) : undefined; const accountKey = session ? `${session.institutionId}:${session.userName}` : '';
  const profile = useStudentProfile();
  const { nickname, isSaving, saveNickname, resetNickname } = useNickname(profile.data?.name);
  const [nicknameOpen, setNicknameOpen] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const defaultName = defaultNickname(profile.data?.name || session?.userName || '');
  const openNickname = () => { setNicknameDraft(nickname); setNicknameError(''); setNicknameOpen(true); };
  const save = async () => {
    const normalized = nicknameDraft.trim();
    if (!normalized) { setNicknameError('Adj meg egy becenevet.'); return; }
    try { await saveNickname(normalized); posthog.capture('nickname_saved'); setNicknameOpen(false); }
    catch { setNicknameError('A becenév mentése sikertelen.'); }
  };
  const reset = async () => {
    try { await resetNickname(); setNicknameOpen(false); }
    catch { setNicknameError('Az alapértelmezett név visszaállítása sikertelen.'); }
  };
  return <><Screen title="Továbbiak">
    <View style={styles.account}><View style={styles.avatar}><Ionicons name="person" size={24} color={colors.blue} /></View><View><Text style={styles.accountName}>{session?.userName}</Text><Text style={styles.accountDetail}>{institution?.name}</Text></View></View>
    <Text style={styles.section}>TANULMÁNYOK</Text><SettingRow icon="school-outline" title="Képzés" detail="Az aktív képzés módosítása" onPress={() => router.push('/training?change=1')} /><SettingRow icon="document-text-outline" title="Vizsgák" detail="Közelgő és korábbi vizsgák" onPress={() => router.push('/exams')} />
    <Text style={styles.section}>FIÓK ÉS ADATOK</Text><SettingRow icon="happy-outline" title="Becenév" detail={greetingFor(nickname)} onPress={openNickname} /><SettingRow icon="swap-horizontal-outline" title="Intézmény vagy fiók váltása" onPress={logout} /><SettingRow icon="trash-outline" title="Gyorsítótár törlése" detail="A mentett naptár- és összefoglaló adatok törlése" onPress={async () => { await clearCache(accountKey); posthog.capture('cache_cleared'); }} /><SettingRow icon="shield-checkmark-outline" title="Adatvédelem" detail="Névtelen kompatibilitási diagnosztika" onPress={() => setPrivacyOpen(true)} /><SettingRow icon="log-out-outline" title="Kijelentkezés" onPress={logout} danger />
    <Text style={styles.version}>Neptun {Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '0.1.0'} · Csak olvasási hozzáférés</Text>
  </Screen>
  <Modal visible={nicknameOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setNicknameOpen(false)}><SafeAreaView style={styles.modal}><KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={styles.modalHeader}><Pressable onPress={() => setNicknameOpen(false)}><Text style={styles.cancel}>Mégse</Text></Pressable><Text style={styles.modalTitle}>Becenév</Text><Pressable disabled={isSaving || !nicknameDraft.trim()} onPress={save}><Text style={[styles.save, (isSaving || !nicknameDraft.trim()) && styles.disabled]}>Mentés</Text></Pressable></View>
    <View style={styles.modalContent}><Text style={styles.modalHelp}>Ezt a nevet használjuk a kezdőképernyő üdvözlésében.</Text><TextInput autoFocus selectTextOnFocus value={nicknameDraft} onChangeText={setNicknameDraft} maxLength={30} returnKeyType="done" onSubmitEditing={save} style={styles.nicknameInput} placeholder={defaultName} placeholderTextColor={colors.muted} />{nicknameError ? <Text accessibilityRole="alert" style={styles.nicknameError}>{nicknameError}</Text> : null}<Pressable disabled={isSaving} onPress={reset} style={styles.resetButton}><Text style={styles.resetText}>Alapértelmezett: {defaultName}</Text></Pressable></View>
  </KeyboardAvoidingView></SafeAreaView></Modal>
  <DiagnosticPrivacyModal visible={privacyOpen} mode="settings" consent={diagnosticConsent} onGrant={() => setDiagnosticConsentForFuture('granted')} onDeny={() => setDiagnosticConsentForFuture('denied')} onClose={() => setPrivacyOpen(false)} />
  </>;
}
const styles = StyleSheet.create({ account: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border }, avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' }, accountName: { color: colors.navy, fontSize: 18, fontWeight: '700' }, accountDetail: { color: colors.muted, marginTop: 3, maxWidth: 280 }, section: { color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.7, marginTop: spacing.xl, marginBottom: spacing.sm }, row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border }, body: { flex: 1 }, title: { color: colors.text, fontSize: 16, fontWeight: '600' }, danger: { color: colors.danger }, detail: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 3 }, version: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: spacing.xl },
  modal: { flex: 1, backgroundColor: '#fff' }, modalHeader: { minHeight: 58, paddingHorizontal: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, modalTitle: { color: colors.navy, fontSize: 18, fontWeight: '700' }, cancel: { color: colors.blue, fontSize: 16 }, save: { color: colors.blue, fontSize: 16, fontWeight: '700' }, disabled: { opacity: 0.4 }, modalContent: { padding: spacing.lg }, modalHelp: { color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: spacing.lg }, nicknameInput: { minHeight: 54, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: '#8992A5', borderRadius: radius.sm, color: colors.text, fontSize: 18 }, nicknameError: { color: colors.danger, marginTop: spacing.sm }, resetButton: { minHeight: 48, marginTop: spacing.lg, alignItems: 'center', justifyContent: 'center' }, resetText: { color: colors.blue, fontSize: 15, fontWeight: '600' }
});
