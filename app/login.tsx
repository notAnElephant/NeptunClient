import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, InputAccessoryView, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { ElteLoginModal } from '@/components/ElteLoginModal';
import { institutions } from '@/data/institutions';
import type { Institution } from '@/domain/models';
import { useSession } from '@/state/SessionContext';
import { colors, radius, spacing } from '@/theme';

const LOGIN_KEYBOARD_ACCESSORY_ID = 'login-keyboard-accessory';

export default function LoginScreen() {
  const { session, authFlow, loginHint, login, loginExternal, continueCaptcha, continueTwoFactor, resetAuthFlow } = useSession();
  const [institution, setInstitution] = useState<Institution>(institutions.find((item) => item.id === loginHint?.institutionId) ?? institutions.find((item) => item.omCode === 'FI23344') ?? institutions[0]);
  const [userName, setUserName] = useState(loginHint?.userName ?? '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [challenge, setChallenge] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [externalLoginOpen, setExternalLoginOpen] = useState(false);
  const [externalError, setExternalError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const passwordInputRef = useRef<TextInput>(null);
  const filtered = useMemo(() => institutions.filter((item) => item.name.toLocaleLowerCase('hu').includes(search.toLocaleLowerCase('hu'))), [search]);

  const isExternalLogin = institution.authenticationMode === 'external';
  const isChallenge = authFlow.state === 'captchaRequired' || authFlow.state === 'twoFactorRequired';
  const submit = async () => {
    if (isExternalLogin && !isChallenge) {
      setExternalError(null);
      setExternalLoginOpen(true);
      return;
    }
    if ((!isChallenge && (!userName || !password)) || (isChallenge && !challenge)) return;
    Keyboard.dismiss();
    if (authFlow.state === 'captchaRequired') return continueCaptcha({ identifier: authFlow.identifier, answer: challenge });
    if (authFlow.state === 'twoFactorRequired') return continueTwoFactor({ code: challenge });
    await login({ institution, userName, password, rememberMe });
  };

  const finishExternalLogin = useCallback(async (guid: string) => {
    setExternalLoginOpen(false);
    setExternalError(null);
    await loginExternal({ institution, guid, rememberMe });
  }, [institution, loginExternal, rememberMe]);

  const failExternalLogin = useCallback((message: string) => {
    setExternalLoginOpen(false);
    setExternalError(message);
  }, []);

  if (session) return <Redirect href="/" />;

  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={styles.content} keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} keyboardShouldPersistTaps="handled">
    <View style={styles.hero}><Text accessibilityRole="header" style={styles.brand}>Neptun</Text></View>
    {!isChallenge ? <>
      <Text style={styles.label}>Intézmény</Text><Pressable accessibilityRole="button" style={styles.input} onPress={() => setPickerOpen(true)}><Ionicons name="business-outline" size={22} color={colors.navy} /><Text numberOfLines={2} style={styles.inputText}>{institution.name}</Text><Ionicons name="chevron-down" size={20} color={colors.navy} /></Pressable>
      {isExternalLogin ? <View style={styles.externalNotice}><Ionicons name="shield-checkmark-outline" size={24} color={colors.blue} /><View style={styles.externalNoticeText}><Text style={styles.externalNoticeTitle}>Biztonságos ELTE bejelentkezés</Text><Text style={styles.externalNoticeHelp}>A Neptun-kódot, a jelszót és a minden belépéskor szükséges kétlépcsős kódot az ELTE saját oldalán adhatod meg.</Text></View></View> : <>
        <Text style={styles.label}>Neptun-kód</Text><View style={styles.input}><Ionicons name="person-outline" size={22} color={colors.muted} /><TextInput value={userName} onChangeText={setUserName} style={styles.textField} autoCapitalize="characters" autoComplete="username" autoCorrect={false} textContentType="username" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => passwordInputRef.current?.focus()} inputAccessoryViewID={Platform.OS === 'ios' ? LOGIN_KEYBOARD_ACCESSORY_ID : undefined} placeholder="Neptun-kód" placeholderTextColor={colors.muted} /></View>
        <Text style={styles.label}>Jelszó</Text><View style={styles.input}><Ionicons name="lock-closed-outline" size={22} color={colors.muted} /><TextInput ref={passwordInputRef} value={password} onChangeText={setPassword} style={styles.textField} secureTextEntry autoCapitalize="none" autoComplete="current-password" textContentType="password" returnKeyType="done" onSubmitEditing={submit} inputAccessoryViewID={Platform.OS === 'ios' ? LOGIN_KEYBOARD_ACCESSORY_ID : undefined} placeholder="Jelszó" placeholderTextColor={colors.muted} /></View>
      </>}
      <View style={styles.rememberRow}><View style={styles.rememberText}><Text style={styles.rememberTitle}>Maradjak bejelentkezve</Text><Text style={styles.rememberHelp}>{Platform.OS === 'web' ? 'A böngészőlap bezárásáig jegyez meg.' : isExternalLogin ? 'A Neptun-hozzáférést tárolja biztonságosan; az ELTE új belépéskor továbbra is kérhet kétlépcsős kódot.' : 'A hitelesítési adatokat biztonságosan, ezen az eszközön tárolja.'}</Text></View><Switch value={rememberMe} onValueChange={setRememberMe} trackColor={{ false: colors.border, true: colors.blue }} thumbColor="#fff" accessibilityLabel="Maradjak bejelentkezve" /></View>
    </> : <>
      <Pressable onPress={() => { resetAuthFlow(); setChallenge(''); }} style={styles.back}><Ionicons name="arrow-back" size={20} color={colors.blue} /><Text style={styles.backText}>Vissza a bejelentkezéshez</Text></Pressable>
      <Text style={styles.challengeTitle}>{authFlow.state === 'captchaRequired' ? 'Biztonsági ellenőrzés' : 'Kétlépcsős azonosítás'}</Text>
      <Text style={styles.help}>{authFlow.state === 'captchaRequired' ? 'Írd be a képen látható ellenőrző kódot.' : 'Írd be az intézményedtől kapott egyszer használatos kódot.'}</Text>
      {authFlow.state === 'captchaRequired' ? <Image resizeMode="contain" source={{ uri: authFlow.imageUrl }} style={styles.captcha} accessibilityLabel="CAPTCHA ellenőrző kép" /> : null}
      <View style={styles.input}><Ionicons name="shield-checkmark-outline" size={22} color={colors.muted} /><TextInput value={challenge} onChangeText={setChallenge} style={styles.textField} autoCapitalize="characters" keyboardType={authFlow.state === 'twoFactorRequired' ? 'number-pad' : 'default'} returnKeyType="done" onSubmitEditing={submit} inputAccessoryViewID={Platform.OS === 'ios' ? LOGIN_KEYBOARD_ACCESSORY_ID : undefined} /></View>
    </>}
    {authFlow.state === 'error' ? <Text accessibilityRole="alert" style={styles.error}>{authFlow.message}</Text> : externalError ? <Text accessibilityRole="alert" style={styles.error}>{externalError}</Text> : null}
    <Pressable disabled={authFlow.state === 'loading' || (!isExternalLogin && !isChallenge && (!userName || !password)) || (isChallenge && !challenge)} onPress={submit} style={({ pressed }) => [styles.button, (pressed || authFlow.state === 'loading') && styles.buttonPressed]}>{authFlow.state === 'loading' ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{isChallenge ? 'Ellenőrzés' : isExternalLogin ? 'Tovább az ELTE bejelentkezéshez' : 'Bejelentkezés'}</Text>}</Pressable>
  </ScrollView></KeyboardAvoidingView>
  {Platform.OS === 'ios' ? <InputAccessoryView nativeID={LOGIN_KEYBOARD_ACCESSORY_ID}><View style={styles.keyboardToolbar}><Pressable accessibilityRole="button" onPress={Keyboard.dismiss} hitSlop={12}><Text style={styles.keyboardDone}>Kész</Text></Pressable></View></InputAccessoryView> : null}
  <Modal visible={pickerOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPickerOpen(false)}><SafeAreaView style={styles.modal}><View style={styles.modalHeader}><Text style={styles.modalTitle}>Intézmény választása</Text><Pressable onPress={() => setPickerOpen(false)}><Text style={styles.done}>Kész</Text></Pressable></View><View style={styles.search}><Ionicons name="search" size={20} color={colors.muted} /><TextInput value={search} onChangeText={setSearch} style={styles.textField} placeholder="Keresés" /></View><FlatList keyboardShouldPersistTaps="handled" data={filtered} keyExtractor={(item) => item.id} renderItem={({ item }) => <Pressable style={styles.institutionRow} onPress={() => { setInstitution(item); setPickerOpen(false); }}><Text style={styles.institutionName}>{item.name}</Text>{item.id === institution.id ? <Ionicons name="checkmark" size={22} color={colors.blue} /> : null}</Pressable>} /></SafeAreaView></Modal>
  <ElteLoginModal visible={externalLoginOpen} onCancel={() => setExternalLoginOpen(false)} onGuid={finishExternalLogin} onError={failExternalLogin} />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 }, content: { flexGrow: 1, paddingHorizontal: spacing.lg, maxWidth: 520, width: '100%', alignSelf: 'center' }, hero: { minHeight: 140, justifyContent: 'flex-end', paddingBottom: spacing.lg }, brand: { color: colors.navy, fontSize: 52, fontWeight: '700', letterSpacing: -1.6 },
  label: { color: colors.text, fontSize: 15, fontWeight: '500', marginBottom: spacing.sm, marginTop: spacing.md }, input: { minHeight: 54, borderWidth: 1, borderColor: '#8992A5', borderRadius: radius.sm, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12 }, inputText: { flex: 1, color: colors.text, fontSize: 16, lineHeight: 21 }, textField: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: 12 },
  captcha: { width: '100%', height: 100, marginBottom: spacing.md, backgroundColor: '#F2F4F7', borderRadius: radius.sm }, button: { height: 54, backgroundColor: colors.blue, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl }, buttonPressed: { opacity: 0.55 }, buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' }, error: { color: colors.danger, marginTop: spacing.md, lineHeight: 20 },
  back: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginBottom: spacing.xl }, backText: { color: colors.blue, fontWeight: '600' }, challengeTitle: { color: colors.navy, fontSize: 26, fontWeight: '700', marginBottom: spacing.sm }, help: { color: colors.muted, fontSize: 16, lineHeight: 23, marginBottom: spacing.lg },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg }, rememberText: { flex: 1 }, rememberTitle: { color: colors.text, fontSize: 15, fontWeight: '600' }, rememberHelp: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  externalNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginTop: spacing.xl, padding: spacing.md, borderRadius: radius.sm, backgroundColor: '#EEF4FF' }, externalNoticeText: { flex: 1 }, externalNoticeTitle: { color: colors.navy, fontSize: 16, fontWeight: '700', marginBottom: spacing.xs }, externalNoticeHelp: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  keyboardToolbar: { minHeight: 44, paddingHorizontal: spacing.md, backgroundColor: '#F2F4F7', borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }, keyboardDone: { color: colors.blue, fontSize: 16, fontWeight: '700' },
  modal: { flex: 1, backgroundColor: '#fff' }, modalHeader: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border }, modalTitle: { color: colors.navy, fontSize: 20, fontWeight: '700' }, done: { color: colors.blue, fontSize: 16, fontWeight: '600' }, search: { margin: spacing.md, minHeight: 46, backgroundColor: '#F2F4F7', borderRadius: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }, institutionRow: { minHeight: 64, marginLeft: spacing.lg, paddingRight: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }, institutionName: { flex: 1, color: colors.text, fontSize: 16, lineHeight: 21 },
});
