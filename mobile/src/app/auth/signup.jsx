import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/utils/auth/useAuth";
import { Colors } from "@/constants/theme";

/**
 * Native signup screen is a stub — real credentials signup runs in the
 * Auth WebView against the local web API. Redirect into that flow.
 */
export default function SignupScreen() {
  const router = useRouter();
  const { signUp, isAuthenticated, isReady } = useAuth();

  useEffect(() => {
    if (!isReady) return;
    if (isAuthenticated) {
      router.replace("/(tabs)/home");
      return;
    }
    signUp();
    router.replace("/");
  }, [isReady, isAuthenticated, signUp, router]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: Colors.ivory,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ActivityIndicator color={Colors.green} />
    </View>
  );
}
