export default ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    ...(process.env.POSTHOG_CLI_API_KEY
      ? [['posthog-react-native/expo', { skipOnConflict: true, uploadNativeSymbols: true }]]
      : []),
  ],
  extra: {
    ...config.extra,
    posthogProjectKey: process.env.EXPO_PUBLIC_POSTHOG_PROJECT_KEY || config.extra?.posthogProjectKey,
    posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST || config.extra?.posthogHost || 'https://eu.i.posthog.com',
  },
})
