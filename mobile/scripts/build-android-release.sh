#!/usr/bin/env bash
set -euo pipefail

# Local Play Store build for Heathland Links (Android App Bundle).
# Requires: JDK 17+, Android SDK, android/keystore.properties + upload keystore.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$ROOT_DIR/android"
AAB_SRC="$ANDROID_DIR/app/build/outputs/bundle/release/app-release.aab"
OUT_DIR="$ANDROID_DIR/build/export"
OUT_AAB="$OUT_DIR/HeathlandLinks-play-store.aab"

usage() {
  cat <<'EOF'
Usage: ./scripts/build-android-release.sh

Builds a signed Android App Bundle (.aab) for Google Play upload.

Prerequisites:
  - android/keystore.properties with storeFile, storePassword, keyAlias, keyPassword
  - Upload keystore file referenced by storeFile
  - JDK 17+ and Android SDK

After build, upload the AAB in Play Console → Production / Testing → Create release.
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ ! -f "$ANDROID_DIR/keystore.properties" ]]; then
  echo "Missing $ANDROID_DIR/keystore.properties" >&2
  exit 1
fi

STORE_FILE="$(grep '^storeFile=' "$ANDROID_DIR/keystore.properties" | cut -d= -f2-)"
if [[ ! -f "$ANDROID_DIR/$STORE_FILE" ]]; then
  echo "Missing keystore: $ANDROID_DIR/$STORE_FILE" >&2
  exit 1
fi

cd "$ROOT_DIR"
if [[ ! -d node_modules ]]; then
  echo "Installing JS dependencies..."
  npm install
fi

# Load EXPO_PUBLIC_* from .env so the release bundle points at production APIs.
# Do not source the whole file — empty CI=/EXPO_OFFLINE= break Expo getenv().
if [[ -f "$ROOT_DIR/.env" ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    if [[ "$line" =~ ^EXPO_PUBLIC_[A-Za-z0-9_]+= ]]; then
      export "$line"
    fi
  done < "$ROOT_DIR/.env"
fi

export CI=false
export EXPO_OFFLINE=0
export EXPO_NO_DOTENV=0
export NODE_ENV=production

cd "$ANDROID_DIR"
chmod +x ./gradlew
echo "Building signed release AAB (version from app/build.gradle)..."
./gradlew :app:bundleRelease --quiet

mkdir -p "$OUT_DIR"
cp "$AAB_SRC" "$OUT_AAB"

echo
echo "Play Store AAB ready:"
echo "  $OUT_AAB"
ls -lh "$OUT_AAB"
echo
echo "Upload this file in Google Play Console → Your app → Production (or Internal testing) → Create new release."
