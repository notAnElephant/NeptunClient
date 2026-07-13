#!/usr/bin/env bash

set -euo pipefail

APK_PATH="${1:-}"
FIREBASE_ANDROID_APP_ID="${FIREBASE_ANDROID_APP_ID:-1:881804148221:android:e6eba8a4001d4e9911ad94}"
FIREBASE_TESTER_GROUP="${FIREBASE_TESTER_GROUP:-internal-testers}"
RELEASE_NOTES="${RELEASE_NOTES:-NeptunClient Android preview}"

if [[ -z "$APK_PATH" || ! -f "$APK_PATH" ]]; then
  echo "Usage: pnpm distribute:android -- /path/to/app.apk" >&2
  exit 1
fi

firebase appdistribution:distribute "$APK_PATH" \
  --app "$FIREBASE_ANDROID_APP_ID" \
  --project neptunclient-app \
  --groups "$FIREBASE_TESTER_GROUP" \
  --release-notes "$RELEASE_NOTES"
