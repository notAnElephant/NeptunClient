import PostHog from 'posthog-react-native'
import Constants from 'expo-constants'
import { redactPostHogProperties } from './posthogPrivacy'

const projectToken = Constants.expoConfig?.extra?.posthogProjectKey as string | undefined
const host = (Constants.expoConfig?.extra?.posthogHost as string) || 'https://eu.i.posthog.com'
const isPostHogConfigured = Boolean(projectToken) && projectToken !== 'phc_your_project_token_here'

if (!isPostHogConfigured && __DEV__) {
  console.warn(
    'PostHog project token not configured. Analytics will be disabled. ' +
      'Set EXPO_PUBLIC_POSTHOG_PROJECT_KEY in your Expo configuration.'
  )
}

export const posthog = new PostHog(projectToken || 'placeholder_key', {
  host,
  disabled: !isPostHogConfigured,
  captureAppLifecycleEvents: true,
  errorTracking: {
    autocapture: {
      uncaughtExceptions: true,
      unhandledRejections: true,
      console: [],
      nativeCrashes: true,
    },
    exceptionSteps: { enabled: true, maxBytes: 16_384 },
  },
  before_send: (event) => {
    if (!event) return null
    return { ...event, properties: redactPostHogProperties(event.properties) }
  },
  flushAt: 20,
  flushInterval: 10000,
  maxBatchSize: 100,
  maxQueueSize: 1000,
  preloadFeatureFlags: true,
  sendFeatureFlagEvent: true,
  featureFlagsRequestTimeoutMs: 10000,
  requestTimeout: 10000,
  fetchRetryCount: 3,
  fetchRetryDelay: 3000,
})

export const isPostHogEnabled = isPostHogConfigured
