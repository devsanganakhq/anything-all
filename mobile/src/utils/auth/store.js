import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import * as Application from 'expo-application';

export const authKey = `${process.env.EXPO_PUBLIC_PROJECT_GROUP_ID}-jwt`;
// Installation time the stored session belongs to (see readStoredSession).
export const installKey = `${authKey}-install`;

const stampInstall = async () => {
  const time = await Application.getInstallationTimeAsync();
  if (time) await SecureStore.setItemAsync(installKey, String(time.getTime()), secureStoreOptions);
};

/**
 * Explicit Keychain options used on every SecureStore call in the auth flow.
 *
 * - keychainService: pinned to a stable name so reads and writes always hit
 *   the same partition. Without this, SecureStore derives a service name from
 *   the bundle that can drift between Classic and EAS builds, causing reads
 *   to miss writes from a previous build.
 * - keychainAccessible: AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY allows the auth
 *   token to be read on every cold launch after the device has been unlocked
 *   once since boot. The default (WHEN_UNLOCKED) refuses access during the
 *   first-unlock window, which is the most common TestFlight failure mode.
 * - requireAuthentication: false keeps SecureStore on its non-biometric code
 *   path, so it never reads NSFaceIDUsageDescription or constructs a
 *   biometry-current-set access control object — both of which can throw
 *   NSException and trip iOS 26's unhandled async-void TurboModule rethrow.
 */
export const secureStoreOptions = {
  keychainService: 'anything-auth',
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  requireAuthentication: false,
};

/**
 * This store manages the authentication state of the application.
 */
// Upper bound on waiting for SecureStore. Keychain/Keystore calls can hang in
// some release builds; the session must still become usable in memory.
const PERSIST_TIMEOUT_MS = 3000;

const settle = (promise) =>
  Promise.race([
    promise.then(
      () => true,
      () => false,
    ),
    new Promise((resolve) => setTimeout(() => resolve(false), PERSIST_TIMEOUT_MS)),
  ]);

export const useAuthStore = create((set) => ({
  isReady: false,
  auth: null,
  /**
   * Sign-in: the session is written to SecureStore BEFORE it is published to
   * the store, so anything that reacts to `auth` (navigation to Home) only runs
   * once the session will survive an app restart.
   *
   * Sign-out: in-memory state is cleared immediately so no screen can keep
   * acting as the previous user while the stored copy is being deleted.
   *
   * Resolves to true when the stored copy was updated, false when SecureStore
   * failed or timed out (the in-memory session is still applied). Never rejects:
   * a throw here would crash on the iOS 26 TurboModule rethrow.
   */
  setAuth: async (auth) => {
    if (!auth) {
      set({ auth: null });
      return settle(SecureStore.deleteItemAsync(authKey, secureStoreOptions));
    }
    const stored = await settle(
      Promise.all([
        SecureStore.setItemAsync(authKey, JSON.stringify(auth), secureStoreOptions),
        stampInstall().catch(() => {}),
      ]),
    );
    set({ auth });
    return stored;
  },
}));

/**
 * This store manages the state of the authentication modal.
 */
export const useAuthModal = create((set) => ({
  isOpen: false,
  mode: 'signup',
  open: (options) => set({ isOpen: true, mode: options?.mode || 'signup' }),
  close: () => set({ isOpen: false }),
}));