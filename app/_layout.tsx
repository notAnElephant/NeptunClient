import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useGlobalSearchParams, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PostHogProvider } from 'posthog-react-native';
import { SessionProvider } from '@/state/SessionContext';
import { colors } from '@/theme';
import { ReauthenticationOverlay } from '@/components/ReauthenticationOverlay';
import { posthog } from '@/config/posthog';

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } }));
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const previousPathname = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      posthog.screen(pathname, { previous_screen: previousPathname.current ?? null, ...params });
      previousPathname.current = pathname;
    }
  }, [pathname, params]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PostHogProvider
        client={posthog}
        autocapture={{
          captureScreens: false,
          captureTouches: true,
          propsToCapture: ['testID'],
          maxElementsCaptured: 20,
        }}
      >
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
            <ReauthenticationOverlay />
          </SessionProvider>
        </QueryClientProvider>
      </PostHogProvider>
    </GestureHandlerRootView>
  );
}
