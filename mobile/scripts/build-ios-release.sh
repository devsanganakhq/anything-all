#!/usr/bin/env bash
set -euo pipefail

# Local App Store build for Heathland Links (no EAS).
# Requires: Xcode, Apple Developer account, signing team configured in Xcode.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
IOS_DIR="$ROOT_DIR/ios"
WORKSPACE="$IOS_DIR/HeathlandLinks.xcworkspace"
SCHEME="HeathlandLinks"
ARCHIVE_PATH="$IOS_DIR/build/HeathlandLinks.xcarchive"
EXPORT_DIR="$IOS_DIR/build/export"
EXPORT_OPTIONS="$IOS_DIR/ExportOptions.plist"

# Prefer user-installed CocoaPods (1.15+) over system 1.12.
RUBY_BIN="$HOME/.gem/ruby/$(ruby -e 'print RUBY_VERSION[/\d+\.\d+/]')/bin"
export PATH="$RUBY_BIN:$PATH"

usage() {
  cat <<'EOF'
Usage: ./scripts/build-ios-release.sh [options]

Options:
  --team TEAM_ID     Apple Developer Team ID (10 chars). Optional if set in Xcode.
  --archive-only     Stop after creating the .xcarchive (skip IPA export).
  -h, --help         Show this help.

Examples:
  ./scripts/build-ios-release.sh --team ABCD123456
  ./scripts/build-ios-release.sh --archive-only

After export, upload the IPA with Apple Transporter or Xcode Organizer.
EOF
}

TEAM_ID=""
ARCHIVE_ONLY=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --team)
      TEAM_ID="$2"
      shift 2
      ;;
    --archive-only)
      ARCHIVE_ONLY=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ ! -d "$IOS_DIR" ]]; then
  echo "ios/ not found. Run: npx expo prebuild --platform ios" >&2
  exit 1
fi

# Load EXPO_PUBLIC_* for the Release JS bundle. Avoid empty CI=/EXPO_OFFLINE=.
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
export NODE_ENV=production

ensure_rn_pods_mode() {
  local rn_version deps_url core_url deps_code core_code
  local deps_tar core_tar
  rn_version="$(node -p "require('$ROOT_DIR/node_modules/react-native/package.json').version")"
  deps_tar="$IOS_DIR/Pods/ReactNativeDependencies-artifacts/reactnative-dependencies-${rn_version}-debug.tar.gz"
  core_tar="$IOS_DIR/Pods/ReactNativeCore-artifacts/reactnative-core-${rn_version}-debug.tar.gz"

  unset RCT_USE_RN_DEP RCT_USE_PREBUILT_RNCORE RCT_USE_LOCAL_RN_DEP RCT_TESTONLY_RNCORE_TARBALL_PATH

  if [[ -f "$deps_tar" && -f "$core_tar" ]]; then
    export RCT_USE_LOCAL_RN_DEP="$deps_tar"
    export RCT_TESTONLY_RNCORE_TARBALL_PATH="$core_tar"
    echo "Using cached React Native prebuilt tarballs (${rn_version})."
    return 0
  fi

  deps_url="https://repo1.maven.org/maven2/com/facebook/react/react-native-artifacts/${rn_version}/react-native-artifacts-${rn_version}-reactnative-dependencies-debug.tar.gz"
  core_url="https://repo1.maven.org/maven2/com/facebook/react/react-native-artifacts/${rn_version}/react-native-artifacts-${rn_version}-reactnative-core-debug.tar.gz"
  deps_code="$(curl -o /dev/null --silent -Iw '%{http_code}' -L "$deps_url" || true)"
  core_code="$(curl -o /dev/null --silent -Iw '%{http_code}' -L "$core_url" || true)"

  if [[ "$deps_code" == "200" && "$core_code" == "200" ]]; then
    export RCT_USE_RN_DEP=1
    export RCT_USE_PREBUILT_RNCORE=1
    echo "Using React Native prebuilt artifacts (${rn_version})."
    return 0
  fi

  echo "React Native prebuilt artifacts unavailable (deps: ${deps_code:-?}, core: ${core_code:-?})." >&2
  echo "If pod install fails, remove ios/Podfile.lock and ios/Pods, wait for Maven," >&2
  echo "then re-run this script once https://repo.reactnative.dev is serving 0.81.5 again." >&2

  # Stale lockfiles from a prior prebuilt install reference ReactNativeDependencies /
  # React-Core-prebuilt and trigger \"Unable to find a specification for ReactNativeDependencies\".
  if [[ -f "$IOS_DIR/Podfile.lock" ]] && rg -q 'ReactNativeDependencies|React-Core-prebuilt' "$IOS_DIR/Podfile.lock"; then
    echo "Removing stale Podfile.lock from a previous prebuilt install."
    rm -f "$IOS_DIR/Podfile.lock"
  fi
}

echo "==> Installing CocoaPods dependencies"
cd "$IOS_DIR"
if [[ "${SKIP_PODS:-}" != "1" ]]; then
  ensure_rn_pods_mode
  # --repo-update refreshes CocoaPods trunk so pinned versions in
  # Podfile.lock (e.g. SDWebImage) resolve when local specs are stale.
  pod install --repo-update
else
  echo "Skipping pod install (SKIP_PODS=1)."
fi

if [[ ! -d "$WORKSPACE" ]]; then
  echo "Workspace missing: $WORKSPACE" >&2
  exit 1
fi

mkdir -p "$IOS_DIR/build"

# Do not pass CODE_SIGN_STYLE / PROVISIONING_PROFILE_SPECIFIER on the
# command line: xcodebuild applies those to every target, including Pods.
# The app target already uses Manual signing + profile heathlandlinks.
XCODEBUILD=(xcodebuild
  -workspace "$WORKSPACE"
  -scheme "$SCHEME"
  -configuration Release
  -destination "generic/platform=iOS"
  -archivePath "$ARCHIVE_PATH"
  archive
  CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES=YES
)

if [[ -n "$TEAM_ID" ]]; then
  XCODEBUILD+=(DEVELOPMENT_TEAM="$TEAM_ID")
fi

echo "==> Archiving (Release)"
"${XCODEBUILD[@]}"

echo "==> Archive created: $ARCHIVE_PATH"

if [[ "$ARCHIVE_ONLY" == true ]]; then
  echo "Skipping IPA export (--archive-only)."
  exit 0
fi

rm -rf "$EXPORT_DIR"
mkdir -p "$EXPORT_DIR"

EXPORT_CMD=(xcodebuild
  -exportArchive
  -archivePath "$ARCHIVE_PATH"
  -exportPath "$EXPORT_DIR"
  -exportOptionsPlist "$EXPORT_OPTIONS"
)

if [[ -n "$TEAM_ID" ]]; then
  EXPORT_CMD+=(DEVELOPMENT_TEAM="$TEAM_ID")
fi

echo "==> Exporting App Store IPA"
"${EXPORT_CMD[@]}"

IPA="$(find "$EXPORT_DIR" -maxdepth 1 -name '*.ipa' -print -quit)"
if [[ -n "$IPA" ]]; then
  echo "==> Done. IPA: $IPA"
else
  echo "Export finished but no .ipa found in $EXPORT_DIR" >&2
  exit 1
fi
