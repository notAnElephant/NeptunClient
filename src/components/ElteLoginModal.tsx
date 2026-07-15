import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { ELTE_LOGIN_URL, extractElteLoginGuid } from '@/data/elteExternalAuth';
import { colors, spacing } from '@/theme';

interface ElteLoginModalProps {
  visible: boolean;
  onCancel(): void;
  onGuid(guid: string): void;
  onError(message: string): void;
}

export function ElteLoginModal({ visible, onCancel, onGuid, onError }: ElteLoginModalProps) {
  const [loading, setLoading] = useState(true);
  const completedRef = useRef(false);

  useEffect(() => {
    if (visible) {
      completedRef.current = false;
      setLoading(true);
    }
  }, [visible]);

  const handleNavigation = useCallback((request: WebViewNavigation) => {
    const guid = extractElteLoginGuid(request.url);
    if (!guid) return true;
    if (!completedRef.current) {
      completedRef.current = true;
      onGuid(guid);
    }
    return false;
  }, [onGuid]);

  if (!visible) return null;

  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.title}>ELTE bejelentkezés</Text>
          <Text style={styles.subtitle}>A jelszót és a kétlépcsős kódot közvetlenül az ELTE kezeli.</Text>
        </View>
        <Pressable accessibilityRole="button" hitSlop={12} onPress={onCancel}><Text style={styles.cancel}>Mégse</Text></Pressable>
      </View>
      <View style={styles.webViewContainer}>
        <WebView
          source={{ uri: ELTE_LOGIN_URL }}
          originWhitelist={['https://*']}
          incognito
          sharedCookiesEnabled={false}
          thirdPartyCookiesEnabled={false}
          setSupportMultipleWindows={false}
          onShouldStartLoadWithRequest={handleNavigation}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={() => onError('Az ELTE bejelentkezési oldala nem tölthető be.')}
          style={styles.webView}
        />
        {loading ? <View pointerEvents="none" style={styles.loading}><ActivityIndicator color={colors.blue} /></View> : null}
      </View>
    </SafeAreaView>
  </Modal>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  heading: { flex: 1 },
  title: { color: colors.navy, fontSize: 19, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  cancel: { color: colors.blue, fontSize: 16, fontWeight: '600' },
  webViewContainer: { flex: 1 },
  webView: { flex: 1 },
  loading: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
});
