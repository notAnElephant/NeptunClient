import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ActivityIndicator, View } from 'react-native';
import { PostHogErrorBoundary, PostHogProvider } from 'posthog-react-native';
import { SessionProvider } from '@/state/SessionContext';
import { colors } from '@/theme';
import { ReauthenticationOverlay } from '@/components/ReauthenticationOverlay';
import { initializePostHog, posthog } from '@/config/posthog';
import { AppErrorFallback } from '@/components/AppErrorFallback';
import { configureUniversityAuthRegistryClient, loadCachedUniversityAuthRegistry, refreshUniversityAuthRegistry } from '@/data/universityAuthRegistry';

function captureDataError(error: Error, operation: string) {
  posthog.captureException(error, { source: 'react_query', operation });
}

export default function RootLayout() {
  const [analyticsReady, setAnalyticsReady] = useState(false);
  const [queryClient] = useState(() => new QueryClient({
    queryCache: new QueryCache({ onError: (error, query) => captureDataError(error, String(query.queryKey[0] ?? 'unknown_query')) }),
    mutationCache: new MutationCache({ onError: (error, _variables, _context, mutation) => captureDataError(error, String(mutation.options.mutationKey?.[0] ?? 'unknown_mutation')) }),
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
  }));
  const pathname = usePathname();
  const previousPathname = useRef<string | undefined>(undefined);

  useEffect(() => {
    let active = true;
    configureUniversityAuthRegistryClient(posthog);
    initializePostHog()
      .then(async () => {
        await loadCachedUniversityAuthRegistry();
        void refreshUniversityAuthRegistry();
      })
      .finally(() => { if (active) setAnalyticsReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (analyticsReady && previousPathname.current !== pathname) {
      posthog.screen(pathname, { previous_screen: previousPathname.current ?? null });
      previousPathname.current = pathname;
    }
  }, [analyticsReady, pathname]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PostHogProvider
        client={posthog}
        autocapture={{
          captureScreens: false,
          captureTouches: false,
        }}
      >
        <PostHogErrorBoundary fallback={AppErrorFallback} additionalProperties={{ source: 'react_render' }}>
          {analyticsReady ? <QueryClientProvider client={queryClient}>
            <SessionProvider>
              <StatusBar style="dark" />
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
              <ReauthenticationOverlay />
            </SessionProvider>
          </QueryClientProvider> : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}><ActivityIndicator color={colors.blue} /></View>}
        </PostHogErrorBoundary>
      </PostHogProvider>
    </GestureHandlerRootView>
  );
}
