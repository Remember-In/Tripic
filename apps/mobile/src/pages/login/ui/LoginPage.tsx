import { useRouter, type Href } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { useAuthSession } from "@/features/auth-session";
import { loginWithKakao } from "@/features/kakao-login";
import { KakaoSymbol } from "@/shared/assets/login";
import { radii, semanticColors, spacing } from "@/shared/config/theme";
import { AppText, Screen } from "@/shared/ui";

export function LoginPage() {
  const router = useRouter();
  const { establishSession } = useAuthSession();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const startKakaoLogin = useCallback(async () => {
    if (isLoggingIn) {
      return;
    }

    setIsLoggingIn(true);

    try {
      const result = await loginWithKakao();
      await establishSession(result);

      const destination =
        result.isNewUser || !result.user.nickname
          ? "/onboarding/nickname"
          : "/";
      router.replace(destination as Href);
    } catch (error) {
      Alert.alert(
        "카카오 로그인에 실패했어요",
        error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsLoggingIn(false);
    }
  }, [establishSession, isLoggingIn, router]);

  return (
    <Screen>
      <View style={styles.content}>
        <Pressable
          accessibilityHint="카카오 계정으로 로그인합니다."
          accessibilityLabel="카카오로 시작하기"
          accessibilityRole="button"
          accessibilityState={{ disabled: isLoggingIn }}
          disabled={isLoggingIn}
          onPress={() => void startKakaoLogin()}
          style={({ pressed }) => [
            styles.button,
            isLoggingIn && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.symbolBackground}>
            <KakaoSymbol
              accessible={false}
              height={14.933}
              pointerEvents="none"
              width={16}
            />
          </View>

          {isLoggingIn ? (
            <ActivityIndicator
              color={semanticColors.text.primary}
              size="small"
            />
          ) : (
            <AppText variant="button03">카카오로 시작하기</AppText>
          )}
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: spacing.md,
  },
  button: {
    alignItems: "center",
    backgroundColor: semanticColors.background.surface,
    borderRadius: radii.large,
    height: 60,
    justifyContent: "center",
    position: "relative",
    width: "100%",
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.64,
  },
  symbolBackground: {
    alignItems: "center",
    backgroundColor: "#FEE500",
    borderRadius: radii.pill,
    height: 28,
    justifyContent: "center",
    left: spacing.xl,
    position: "absolute",
    width: 28,
  },
});
