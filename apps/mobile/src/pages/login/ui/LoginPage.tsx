import { useRouter, type Href } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAppConfigQuery } from "@/entities/app-config";
import {
  AppleLoginCancelledError,
  isAppleLoginAvailable,
  loginWithApple,
} from "@/features/apple-login";
import { useAuthSession } from "@/features/auth-session";
import { loginWithKakao } from "@/features/kakao-login";
import { KakaoSymbol } from "@/shared/assets/login";
import { palette, radii, semanticColors, spacing } from "@/shared/config/theme";
import { AppText, Screen } from "@/shared/ui";

type LoginMethod = "APPLE" | "KAKAO" | null;

export function LoginPage() {
  const router = useRouter();
  const appConfigQuery = useAppConfigQuery();
  const { establishSession } = useAuthSession();
  const [activeLogin, setActiveLogin] = useState<LoginMethod>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const isBusy = activeLogin !== null;
  const showAppleLogin =
    appleAvailable && appConfigQuery.data?.features.appleLogin === true;

  useEffect(() => {
    let active = true;

    void isAppleLoginAvailable()
      .then((available) => {
        if (active) setAppleAvailable(available);
      })
      .catch(() => {
        if (active) setAppleAvailable(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const finishLogin = useCallback(
    async (
      result: Awaited<ReturnType<typeof loginWithApple>>,
      provider: "APPLE" | "KAKAO",
    ) => {
      await establishSession(result, provider);
      router.replace(
        (result.isNewUser || !result.user.nickname
          ? "/onboarding/nickname"
          : "/") as Href,
      );
    },
    [establishSession, router],
  );

  const startAppleLogin = useCallback(async () => {
    if (isBusy) return;
    setActiveLogin("APPLE");
    try {
      await finishLogin(await loginWithApple(), "APPLE");
    } catch (error) {
      if (!(error instanceof AppleLoginCancelledError)) {
        Alert.alert(
          "Apple 로그인에 실패했어요",
          error instanceof Error
            ? error.message
            : "잠시 후 다시 시도해 주세요.",
        );
      }
    } finally {
      setActiveLogin(null);
    }
  }, [finishLogin, isBusy]);

  const startKakaoLogin = useCallback(async () => {
    if (isBusy) return;
    setActiveLogin("KAKAO");
    try {
      await finishLogin(await loginWithKakao(), "KAKAO");
    } catch (error) {
      Alert.alert(
        "카카오 로그인에 실패했어요",
        error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setActiveLogin(null);
    }
  }, [finishLogin, isBusy]);

  return (
    <Screen
      statusBarBackgroundColor={semanticColors.brand.primary}
      statusBarStyle="dark"
      style={styles.screen}
    >
      <View style={styles.content}>
        <View style={styles.brand}>
          <AppText style={styles.brandName}>Tripic</AppText>
          <AppText style={styles.tagline} variant="body02">
            사진으로 기록하는 나의 여행
          </AppText>
        </View>

        <View style={styles.actions}>
          {showAppleLogin ? (
            <LoginButton
              accessibilityLabel="Apple로 시작하기"
              disabled={isBusy}
              loading={activeLogin === "APPLE"}
              onPress={() => void startAppleLogin()}
              symbol={
                <View style={styles.appleSymbolBackground}>
                  <Text style={styles.appleSymbol}></Text>
                </View>
              }
              text="Apple로 시작하기"
            />
          ) : null}

          <LoginButton
            accessibilityLabel="카카오로 시작하기"
            disabled={isBusy}
            loading={activeLogin === "KAKAO"}
            onPress={() => void startKakaoLogin()}
            symbol={
              <View style={styles.kakaoSymbolBackground}>
                <KakaoSymbol
                  accessible={false}
                  height={15}
                  pointerEvents="none"
                  width={16}
                />
              </View>
            }
            text="카카오로 시작하기"
          />
        </View>
      </View>
    </Screen>
  );
}

type LoginButtonProps = {
  accessibilityLabel: string;
  disabled: boolean;
  loading: boolean;
  onPress: () => void;
  symbol: React.ReactNode;
  text: string;
};

function LoginButton({
  accessibilityLabel,
  disabled,
  loading,
  onPress,
  symbol,
  text,
}: LoginButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.loginButton,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.symbol}>{symbol}</View>
      {loading ? (
        <ActivityIndicator color={semanticColors.text.primary} size="small" />
      ) : (
        <AppText style={styles.loginLabel} variant="button03">
          {text}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.sm,
  },
  appleSymbol: {
    color: palette.gray.white,
    fontFamily: "System",
    fontSize: 22,
    lineHeight: 25,
  },
  appleSymbolBackground: {
    alignItems: "center",
    backgroundColor: palette.gray.black,
    borderRadius: radii.pill,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  brand: {
    alignItems: "center",
    gap: spacing.xxs,
  },
  brandName: {
    color: palette.gray.white,
    fontSize: 48,
    fontWeight: "700",
    letterSpacing: -1.5,
    lineHeight: 58,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingTop: 236,
  },
  disabled: {
    opacity: 0.62,
  },
  kakaoSymbolBackground: {
    alignItems: "center",
    backgroundColor: "#FEE500",
    borderRadius: radii.pill,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  loginButton: {
    alignItems: "center",
    backgroundColor: semanticColors.background.surface,
    borderRadius: radii.large,
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 60,
    paddingHorizontal: spacing.xl,
    position: "relative",
  },
  loginLabel: {
    textAlign: "center",
  },
  pressed: {
    opacity: 0.76,
  },
  screen: {
    backgroundColor: semanticColors.brand.primary,
  },
  symbol: {
    left: spacing.xl,
    position: "absolute",
  },
  tagline: {
    color: palette.gray.white,
  },
});
