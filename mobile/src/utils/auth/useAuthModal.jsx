import React from "react";
import { Modal, View } from "react-native";
import { AuthWebView } from "./AuthWebView";
import { useAuthStore, useAuthModal } from "./store";


/**
 * This component renders a modal for authentication purposes.
 * To show it programmatically, you should either use the `useRequireAuth` hook or the `useAuthModal` hook.
 *
 * @example
 * ```js
 * import { useAuthModal } from '@/utils/useAuthModal';
 * function MyComponent() {
 * const { open } = useAuthModal();
 * return <Button title="Login" onPress={() => open({ mode: 'signin' })} />;
 * }
 * ```
 *
 * @example
 * ```js
 * import { useRequireAuth } from '@/utils/useAuth';
 * function MyComponent() {
 *   // automatically opens the auth modal if the user is not authenticated
 *   useRequireAuth();
 *   return <Text>Protected Content</Text>;
 * }
 *
 */
export const AuthModal = () => {
  const { isOpen, mode, close } = useAuthModal();
  const { auth } = useAuthStore();
  const proxyURL = process.env.EXPO_PUBLIC_PROXY_BASE_URL;
  const baseURL = process.env.EXPO_PUBLIC_BASE_URL;
  if (!proxyURL && !baseURL) {
    return null;
  }

  const visible = isOpen && !auth;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={close}
    >
      <View style={{ flex: 1, backgroundColor: "#0e1e15" }}>
        <AuthWebView
          mode={mode}
          proxyURL={proxyURL}
          baseURL={baseURL}
          onClose={close}
        />
      </View>
    </Modal>
  );
};

export default useAuthModal;