import { useCallback, useEffect, useState } from 'react';
import { AppState, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { diagnosticUrlMetadata, type LoginDiagnosticRecorder } from '@/data/loginDiagnostics';
import { colors, spacing } from '@/theme';
import type { CompatibilityLoginModalProps } from './CompatibilityLoginModal';

const CALLBACK_KEYS = new Set(['guid', 'serviceurl', 'url', 'code', 'state', 'error', 'access_token']);

export function CompatibilityLoginModal({ visible, initialUrl, diagnostics, onClose }: CompatibilityLoginModalProps) {
  const [hostname, setHostname] = useState(() => initialUrl ? diagnosticUrlMetadata(initialUrl)?.host ?? '' : '');

  const recordUrl = useCallback((rawUrl: string) => {
    const metadata = diagnosticUrlMetadata(rawUrl);
    if (!metadata) return;
    setHostname(metadata.host);
    diagnostics?.recordNavigation(rawUrl);
    let hasCallbackShape = false;
    try { hasCallbackShape = [...new URL(rawUrl).searchParams.keys()].some((key) => CALLBACK_KEYS.has(key.toLowerCase())); }
    catch { /* The validated metadata above already excludes malformed URLs. */ }
    if (hasCallbackShape) {
      diagnostics?.record({
        stage: 'compatibility-probe',
        operation: 'probe-callback-shape',
        probe_event: 'callback-shape',
        ...metadata,
      });
    }
  }, [diagnostics]);

  useEffect(() => {
    if (!visible) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        diagnostics?.record({ stage: 'compatibility-probe', operation: 'probe-backgrounded', probe_event: 'backgrounded' });
        void diagnostics?.flush().catch(() => undefined);
      }
    });
    return () => subscription.remove();
  }, [diagnostics, visible]);

  const close = useCallback(() => {
    diagnostics?.record({ stage: 'compatibility-probe', operation: 'probe-closed', probe_event: 'closed' });
    void diagnostics?.flush().catch(() => undefined);
    onClose();
  }, [diagnostics, onClose]);

  const permitNavigation = useCallback((request: { url: string }) => {
    if (!diagnosticUrlMetadata(request.url)) {
      diagnostics?.record({ stage: 'compatibility-probe', operation: 'probe-navigation-blocked', probe_event: 'load-error', error_code: 'non-https-navigation' });
      return false;
    }
    recordUrl(request.url);
    return true;
  }, [diagnostics, recordUrl]);

  if (!initialUrl) return null;
  return <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={close}>
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.hostBlock}><Ionicons name="lock-closed" size={15} color={colors.blue} /><Text numberOfLines={1} style={styles.host}>{hostname}</Text></View>
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Kompatibilitási mód bezárása" hitSlop={10}><Text style={styles.close}>Bezárás</Text></Pressable>
      </View>
      <View style={styles.notice}><Text style={styles.noticeText}>Privát próbaablak. Az alkalmazás nem látja és nem rögzíti az űrlapmezőket vagy az oldal tartalmát.</Text></View>
      <WebView
        source={{ uri: initialUrl }}
        originWhitelist={['https://*']}
        incognito
        cacheEnabled={false}
        sharedCookiesEnabled={false}
        thirdPartyCookiesEnabled
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={permitNavigation}
        onNavigationStateChange={(navigation: WebViewNavigation) => recordUrl(navigation.url)}
        onError={(event) => {
          const metadata = diagnosticUrlMetadata(event.nativeEvent.url);
          diagnostics?.record({ stage: 'compatibility-probe', operation: 'probe-load-error', probe_event: 'load-error', error_code: 'webview-load-error', ...(metadata ?? {}) });
        }}
        onHttpError={(event) => {
          const metadata = diagnosticUrlMetadata(event.nativeEvent.url);
          diagnostics?.record({ stage: 'compatibility-probe', operation: 'probe-http-error', probe_event: 'http-error', error_code: 'http-error', status: event.nativeEvent.statusCode, ...(metadata ?? {}) });
        }}
      />
    </SafeAreaView>
  </Modal>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  hostBlock: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginRight: spacing.md },
  host: { flex: 1, color: colors.navy, fontSize: 14, fontWeight: '600' }, close: { color: colors.blue, fontSize: 16, fontWeight: '700' },
  notice: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: '#EEF4FF' }, noticeText: { color: colors.muted, fontSize: 12, lineHeight: 17 },
});
