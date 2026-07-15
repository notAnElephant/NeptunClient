import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SessionProvider } from '@/state/SessionContext';
import { colors } from '@/theme';
import { ReauthenticationOverlay } from '@/components/ReauthenticationOverlay';

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } }));
  return <GestureHandlerRootView style={{ flex: 1 }}><QueryClientProvider client={queryClient}><SessionProvider><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} /><ReauthenticationOverlay /></SessionProvider></QueryClientProvider></GestureHandlerRootView>;
}
