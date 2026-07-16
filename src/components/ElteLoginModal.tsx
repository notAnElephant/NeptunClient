import { useCallback, useEffect, useRef, useState, type ComponentProps } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview';
import { ELTE_LOGIN_URL, ELTE_STUDENT_WEB_HANDOFF_SCRIPT, extractElteLoginCallback, shouldAttemptElteStudentWebHandoff, type ElteLoginCallback } from '@/data/elteExternalAuth';
import { beginElteLoginDiagnostics, recordElteLoginDiagnostic, recordElteLoginNavigation } from '@/data/elteLoginDiagnostics';
import { colors, spacing } from '@/theme';

interface ElteLoginModalProps {
  visible: boolean;
  onCancel(): void;
  onComplete(callback: ElteLoginCallback): void;
  onError(message: string): void;
}

type WebViewLoadEndEvent = Parameters<NonNullable<ComponentProps<typeof WebView>['onLoadEnd']>>[0];

export function ElteLoginModal({ visible, onCancel, onComplete, onError }: ElteLoginModalProps) {
  const [loading, setLoading] = useState(true);
  const completedRef = useRef(false);
  const handoffAttemptedRef = useRef(false);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    if (visible) {
      completedRef.current = false;
      handoffAttemptedRef.current = false;
      setLoading(true);
      beginElteLoginDiagnostics();
    }
  }, [visible]);

  const handleNavigation = useCallback((request: WebViewNavigation) => {
    recordElteLoginNavigation('navigation_requested', request.url);
    const callback = extractElteLoginCallback(request.url);
    if (!callback) return true;
    if (!completedRef.current) {
      completedRef.current = true;
      recordElteLoginDiagnostic('callback_detected');
      onComplete(callback);
    }
    return false;
  }, [onComplete]);

  const handleLoadEnd = useCallback((event: WebViewLoadEndEvent) => {
    setLoading(false);
    recordElteLoginNavigation('load_finished', event.nativeEvent.url);
    if (!handoffAttemptedRef.current && shouldAttemptElteStudentWebHandoff(event.nativeEvent.url)) {
      handoffAttemptedRef.current = true;
      recordElteLoginDiagnostic('student_web_handoff_started');
      webViewRef.current?.injectJavaScript(ELTE_STUDENT_WEB_HANDOFF_SCRIPT);
    }
  }, []);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data) as { type?: string; found?: boolean };
      if (message.type === 'elte-student-web-link') recordElteLoginDiagnostic('student_web_link_result', { found: message.found === true });
    } catch {
      recordElteLoginDiagnostic('student_web_message_invalid');
    }
  }, []);

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
          ref={webViewRef}
          source={{ uri: ELTE_LOGIN_URL }}
          originWhitelist={['https://*']}
          incognito
          sharedCookiesEnabled={false}
          thirdPartyCookiesEnabled={false}
          setSupportMultipleWindows={false}
          onShouldStartLoadWithRequest={handleNavigation}
          onNavigationStateChange={(state) => recordElteLoginNavigation('navigation_changed', state.url)}
          onLoadStart={(event) => { setLoading(true); recordElteLoginNavigation('load_started', event.nativeEvent.url); }}
          onLoadEnd={handleLoadEnd}
          onMessage={handleMessage}
          onHttpError={(event) => recordElteLoginDiagnostic('http_error', { statusCode: event.nativeEvent.statusCode })}
          onError={(event) => {
            recordElteLoginDiagnostic('webview_error', { code: event.nativeEvent.code, domain: event.nativeEvent.domain });
            onError('Az ELTE bejelentkezési oldala nem tölthető be.');
          }}
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
