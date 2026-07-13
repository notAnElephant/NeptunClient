import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '@/state/SessionContext';
import { colors } from '@/theme';

const icons: Record<string, keyof typeof Ionicons.glyphMap> = { index: 'home-outline', calendar: 'calendar-outline', messages: 'chatbubble-outline', more: 'menu-outline' };
const activeIcons: Record<string, keyof typeof Ionicons.glyphMap> = { index: 'home', calendar: 'calendar', messages: 'chatbubble', more: 'menu' };

export default function TabLayout() {
  const { session } = useSession();
  if (!session) return <Redirect href="/login" />;
  if (!session.activeTrainingId) return <Redirect href="/training" />;
  return <Tabs screenOptions={({ route }) => ({ headerShown: false, tabBarActiveTintColor: colors.blue, tabBarInactiveTintColor: colors.muted, tabBarLabelStyle: { fontSize: 11, fontWeight: '500' }, tabBarStyle: { height: 82, paddingTop: 8, backgroundColor: '#fff', borderTopColor: colors.border }, tabBarIcon: ({ color, focused, size }) => <Ionicons name={(focused ? activeIcons : icons)[route.name] ?? 'ellipse-outline'} color={color} size={size} /> })}>
    <Tabs.Screen name="index" options={{ title: 'Kezdőlap' }} />
    <Tabs.Screen name="calendar" options={{ title: 'Naptár' }} />
    <Tabs.Screen name="messages" options={{ title: 'Üzenetek' }} />
    <Tabs.Screen name="more" options={{ title: 'Továbbiak' }} />
  </Tabs>;
}
