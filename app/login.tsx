import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { institutions } from '@/data/institutions';
import type { Institution } from '@/domain/models';
import { useSession } from '@/state/SessionContext';
import { colors, radius, spacing } from '@/theme';

export default function LoginScreen() {
  const { session, authFlow, loginHint, login, continueCaptcha, continueTwoFactor, resetAuthFlow } = useSession();
  const [institution, setInstitution] = useState<Institution>(institutions.find((item) => item.id === loginHint?.institutionId) ?? institutions.find((item) => item.omCode === 'FI23344') ?? institutions[0]);
  const [userName, setUserName] = useState(loginHint?.userName ?? '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [challenge, setChallenge] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => institutions.filter((item) => item.name.toLocaleLowerCase('hu').includes(search.toLocaleLowerCase('hu'))), [search]);
  if (session) return <Redirect href="/" />;

  const isChallenge = authFlow.state === 'captchaRequired' || authFlow.state === 'twoFactorRequired';
  const submit = async () => {
    if (authFlow.state === 'captchaRequired') return continueCaptcha({ identifier: authFlow.identifier, answer: challenge });
    if (authFlow.state === 'twoFactorRequired') return continueTwoFactor({ code: challenge });
    await login({ institution, userName, password, rememberMe });
  };

  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><View style={styles.content}>
    <View style={styles.hero}><Text accessibilityRole="header" style={styles.brand}>Neptun</Text></View>
    {!isChallenge ? <>
      <Text style={styles.label}>Intézmény</Text><Pressable accessibilityRole="button" style={styles.input} onPress={() => setPickerOpen(true)}><Ionicons name="business-outline" size={22} color={colors.navy} /><Text numberOfLines={2} style={styles.inputText}>{institution.name}</Text><Ionicons name="chevron-down" size={20} color={colors.navy} /></Pressable>
      <Text style={styles.label}>Neptun-kód</Text><View style={styles.input}><Ionicons name="person-outline" size={22} color={colors.muted} /><TextInput value={userName} onChangeText={setUserName} style={styles.textField} autoCapitalize="characters" autoCorrect={false} placeholder="Neptun-kód" placeholderTextColor={colors.muted} /></View>
      <Text style={styles.label}>Jelszó</Text><View style={styles.input}><Ionicons name="lock-closed-outline" size={22} color={colors.muted} /><TextInput value={password} onChangeText={setPassword} style={styles.textField} secureTextEntry autoCapitalize="none" placeholder="Jelszó" placeholderTextColor={colors.muted} /></View>
      <View style={styles.rememberRow}><View style={styles.rememberText}><Text style={styles.rememberTitle}>Maradjak bejelentkezve</Text><Text style={styles.rememberHelp}>{Platform.OS === 'web' ? 'A böngészőlap bezárásáig jegyez meg.' : 'A hitelesítési adatokat biztonságosan, ezen az eszközön tárolja.'}</Text></View><Switch value={rememberMe} onValueChange={setRememberMe} trackColor={{ false: colors.border, true: colors.blue }} thumbColor="#fff" accessibilityLabel="Maradjak bejelentkezve" /></View>
    </> : <>
      <Pressable onPress={() => { resetAuthFlow(); setChallenge(''); }} style={styles.back}><Ionicons name="arrow-back" size={20} color={colors.blue} /><Text style={styles.backText}>Vissza a bejelentkezéshez</Text></Pressable>
      <Text style={styles.challengeTitle}>{authFlow.state === 'captchaRequired' ? 'Biztonsági ellenőrzés' : 'Kétlépcsős azonosítás'}</Text>
      <Text style={styles.help}>{authFlow.state === 'captchaRequired' ? 'Írd be a képen látható ellenőrző kódot.' : 'Írd be az intézményedtől kapott egyszer használatos kódot.'}</Text>
      {authFlow.state === 'captchaRequired' ? <Image resizeMode="contain" source={{ uri: authFlow.imageUrl }} style={styles.captcha} accessibilityLabel="CAPTCHA ellenőrző kép" /> : null}
      <View style={styles.input}><Ionicons name="shield-checkmark-outline" size={22} color={colors.muted} /><TextInput value={challenge} onChangeText={setChallenge} style={styles.textField} autoCapitalize="characters" keyboardType={authFlow.state === 'twoFactorRequired' ? 'number-pad' : 'default'} /></View>
    </>}
    {authFlow.state === 'error' ? <Text accessibilityRole="alert" style={styles.error}>{authFlow.message}</Text> : null}
    <Pressable disabled={authFlow.state === 'loading' || (!isChallenge && (!userName || !password)) || (isChallenge && !challenge)} onPress={submit} style={({ pressed }) => [styles.button, (pressed || authFlow.state === 'loading') && styles.buttonPressed]}>{authFlow.state === 'loading' ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{isChallenge ? 'Ellenőrzés' : 'Bejelentkezés'}</Text>}</Pressable>
  </View></KeyboardAvoidingView>
  <Modal visible={pickerOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPickerOpen(false)}><SafeAreaView style={styles.modal}><View style={styles.modalHeader}><Text style={styles.modalTitle}>Intézmény választása</Text><Pressable onPress={() => setPickerOpen(false)}><Text style={styles.done}>Kész</Text></Pressable></View><View style={styles.search}><Ionicons name="search" size={20} color={colors.muted} /><TextInput value={search} onChangeText={setSearch} style={styles.textField} placeholder="Keresés" /></View><FlatList keyboardShouldPersistTaps="handled" data={filtered} keyExtractor={(item) => item.id} renderItem={({ item }) => <Pressable style={styles.institutionRow} onPress={() => { setInstitution(item); setPickerOpen(false); }}><Text style={styles.institutionName}>{item.name}</Text>{item.id === institution.id ? <Ionicons name="checkmark" size={22} color={colors.blue} /> : null}</Pressable>} /></SafeAreaView></Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 }, content: { flex: 1, paddingHorizontal: spacing.lg, maxWidth: 520, width: '100%', alignSelf: 'center' }, hero: { minHeight: 140, justifyContent: 'flex-end', paddingBottom: spacing.lg }, brand: { color: colors.navy, fontSize: 52, fontWeight: '700', letterSpacing: -1.6 },
  label: { color: colors.text, fontSize: 15, fontWeight: '500', marginBottom: spacing.sm, marginTop: spacing.md }, input: { minHeight: 54, borderWidth: 1, borderColor: '#8992A5', borderRadius: radius.sm, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12 }, inputText: { flex: 1, color: colors.text, fontSize: 16, lineHeight: 21 }, textField: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: 12 },
  captcha: { width: '100%', height: 100, marginBottom: spacing.md, backgroundColor: '#F2F4F7', borderRadius: radius.sm }, button: { height: 54, backgroundColor: colors.blue, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl }, buttonPressed: { opacity: 0.55 }, buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' }, error: { color: colors.danger, marginTop: spacing.md, lineHeight: 20 },
  back: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginBottom: spacing.xl }, backText: { color: colors.blue, fontWeight: '600' }, challengeTitle: { color: colors.navy, fontSize: 26, fontWeight: '700', marginBottom: spacing.sm }, help: { color: colors.muted, fontSize: 16, lineHeight: 23, marginBottom: spacing.lg },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg }, rememberText: { flex: 1 }, rememberTitle: { color: colors.text, fontSize: 15, fontWeight: '600' }, rememberHelp: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  modal: { flex: 1, backgroundColor: '#fff' }, modalHeader: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border }, modalTitle: { color: colors.navy, fontSize: 20, fontWeight: '700' }, done: { color: colors.blue, fontSize: 16, fontWeight: '600' }, search: { margin: spacing.md, minHeight: 46, backgroundColor: '#F2F4F7', borderRadius: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }, institutionRow: { minHeight: 64, marginLeft: spacing.lg, paddingRight: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }, institutionName: { flex: 1, color: colors.text, fontSize: 16, lineHeight: 21 },
});
