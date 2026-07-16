const calendarWidget = {
  name: 'CalendarWidget',
  displayName: 'Neptun naptár',
  description: 'A következő órák és vizsgák gyors áttekintése.',
  supportedFamilies: ['systemSmall', 'systemMedium'],
  contentMarginsDisabled: false,
  ios: {
    supportedFamilies: ['systemSmall', 'systemMedium'],
  },
  android: null,
}

const iosWidgetsDisabled = process.env.EXPO_PUBLIC_DISABLE_IOS_WIDGET === 'true'

export default ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    ...(iosWidgetsDisabled
      ? []
      : [
          './plugins/withExpoWidgetsWithoutPush',
          ['expo-widgets', {
            groupIdentifier: 'group.hu.neptun.companion',
            enablePushNotifications: false,
            widgets: [calendarWidget],
          }],
        ]),
    ['react-native-android-widget', {
      widgets: [{
        name: 'CalendarWidget',
        label: 'Neptun naptár',
        description: 'A következő órák és vizsgák gyors áttekintése.',
        minWidth: '110dp',
        minHeight: '110dp',
        targetCellWidth: 2,
        targetCellHeight: 2,
        maxResizeWidth: '320dp',
        maxResizeHeight: '180dp',
        resizeMode: 'horizontal',
        updatePeriodMillis: 1800000,
      }],
    }],
    ...(process.env.POSTHOG_CLI_API_KEY
      ? [['posthog-react-native/expo', { skipOnConflict: true, uploadNativeSymbols: true }]]
      : []),
  ],
  extra: {
    ...config.extra,
    iosWidgetsDisabled,
    posthogProjectKey: process.env.EXPO_PUBLIC_POSTHOG_PROJECT_KEY || config.extra?.posthogProjectKey,
    posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST || config.extra?.posthogHost || 'https://eu.i.posthog.com',
  },
})
