# Android preview distribution

Android preview builds are distributed through Firebase App Distribution.

## Firebase resources

- Project: `neptunclient-app`
- Android package: `hu.neptun.companion`
- Firebase App ID: `1:881804148221:android:e6eba8a4001d4e9911ad94`
- Tester group: `internal-testers`
- CI service account: `neptun-app-distribution-ci@neptunclient-app.iam.gserviceaccount.com`

The CI service account only has the `Firebase App Distribution Admin` role.
Service account keys and Expo tokens must never be committed.

## Local distribution

Sign in with the Firebase CLI, then pass an EAS-generated APK to the project
script:

```sh
firebase login
RELEASE_NOTES="Short description" pnpm distribute:android -- ./app.apk
```

Every member of `internal-testers` receives an email when the release is
distributed.

Add another tester with:

```sh
firebase appdistribution:testers:add person@example.com \
  --group-alias internal-testers \
  --project neptunclient-app
```

## GitHub Actions

`.github/workflows/distribute-android.yml` verifies the app, asks EAS to build
a signed preview APK, downloads the artifact, and distributes it to the Firebase
tester group. It runs manually and on pushes to `main`.

The repository must contain these GitHub Actions secrets:

- `EXPO_TOKEN`: an Expo access token allowed to build
  `@notanelephants-team/neptunclient`.
- `FIREBASE_SERVICE_ACCOUNT_NEPTUNCLIENT_APP`: the complete JSON key for the
  dedicated CI service account above.

Prefer replacing the JSON key with GitHub Workload Identity Federation once the
final GitHub repository and organization are known.

## Links

- [Firebase release](https://console.firebase.google.com/project/neptunclient-app/appdistribution/app/android:hu.neptun.companion/releases/6l81fkpn6ub48)
- [Tester installation page](https://appdistribution.firebase.google.com/testerapps/1:881804148221:android:e6eba8a4001d4e9911ad94/releases/6l81fkpn6ub48)
