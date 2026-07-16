# NeptunClient

An unofficial, student-focused mobile client for Hungarian Neptun university
administration systems. The application is built with Expo and React Native and
targets Android and iOS from a shared TypeScript codebase.

The MVP is read-only. It provides a consistent interface for institutions backed
by either a documented modern Neptun API or the legacy `MobileService.svc` API.

## MVP features

- Institution and account selection
- Trainings and academic terms
- Daily overview and calendar
- Inbox and message details
- Upcoming and past exams
- Offline-aware cached summaries
- Secure credential and session storage

No write operation is exposed. Message read state is local to the application.

## Development

Requirements:

- Node.js 22
- pnpm 10
- Expo development environment

```sh
pnpm install
pnpm start
```

Run the checks with:

```sh
pnpm typecheck
pnpm test
pnpm exec expo install --check
```

## Android builds

```sh
# Installable internal APK
pnpm dlx eas-cli build --platform android --profile preview

# Google Play AAB
pnpm dlx eas-cli build --platform android --profile production
```

Preview builds are distributed through Firebase App Distribution. See
[the distribution guide](docs/APP_DISTRIBUTION.md).

## iOS builds

The calendar widget uses an App Group to share its timeline with the main app.
App Groups require a paid Apple Developer Program team when installing on a
physical device. Build the full app (including the widget) with:

```sh
pnpm ios --device "Device name"
```

For local testing with a free Personal Team, build the main app without the iOS
widget target:

```sh
pnpm ios:personal --device "Device name"
```

The Android widget is unaffected by this iOS-only build mode.

## Architecture

Feature code uses a shared `NeptunProvider` contract and never calls raw Neptun
URLs. Provider-specific request formats, authentication, response envelopes, and
normalization remain private to the modern and legacy adapters.

Credentials and tokens are stored with Expo SecureStore only when the user opts
to stay signed in. Otherwise they remain in memory for the current app session.
Calendar and dashboard summaries may be cached locally; message bodies are not
persisted.

## API documentation and attribution

The legacy API research and institution list originate from
[GreGamingHUN/Neptun-API](https://github.com/GreGamingHUN/Neptun-API). Additional
BME API research is stored under [`docs/`](docs/). This is an unofficial project
and is not affiliated with SDA Informatika or any university.

Do not commit real Neptun credentials, tokens, cookies, student identifiers, or
message contents. Use sanitized fixtures when adding tests.

## License

[MIT](LICENSE)
