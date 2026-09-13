import * as AppleAuthentication from "expo-apple-authentication";
import { useRouter, type Href } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
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
import { radii, semanticColors, spacing } from "@/shared/config/theme";
import { AppText, Screen } from "@/shared/ui";

type LoginMethod = "APPLE" | "KAKAO" | null;

export function LoginPage() {
  const router = useRouter();
  const appConfigQuery = useAppConfigQuery();
  const { continueAsGuest, establishSession } = useAuthSession();
  const [activeLogin, setActiveLogin] = useState<LoginMethod>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [isEnteringGuestMode, setEnteringGuestMode] = useState(false);
  const isBusy = activeLogin !== null || isEnteringGuestMode;
  const showAppleLogin =
    appleAvailable && appConfigQuery.data?.features.appleLogin === true;

  useEffect(() => {
    let active = true;

    void isAppleLoginAvailable()
      .then((available) => {
        if (active) {
          setAppleAvailable(available);
        }
      })
      .catch(() => {
        if (active) {
          setAppleAvailable(false);
        }
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
      const destination =
        result.isNewUser || !result.user.nickname
          ? "/onboarding/nickname"
          : "/";
      router.replace(destination as Href);
    },
    [establishSession, router],
  );

  const startAppleLogin = useCallback(async () => {
    if (isBusy) {
      return;
    }

    setActiveLogin("APPLE");

    try {
      await finishLogin(await loginWithApple(), "APPLE");
    } catch (error) {
      if (!(error instanceof AppleLoginCancelledError)) {
        Alert.alert(
          "Apple 로그인에 실패했어요",
          error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.",
        );
      }
    } finally {
      setActiveLogin(null);
    }
  }, [finishLogin, isBusy]);

  const startKakaoLogin = useCallback(async () => {
    if (isBusy) {
      return;
    }

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

  const startAsGuest = useCallback(async () => {
    if (isBusy) {
      return;
    }

    setEnteringGuestMode(true);
    try {
      await continueAsGuest();
      router.replace("/");
    } catch {
      Alert.alert(
        "게스트 모드를 시작하지 못했어요",
        "잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setEnteringGuestMode(false);
    }
  }, [continueAsGuest, isBusy, router]);

  return (
    <Screen>
      <View style={styles.content}>
        <View style={styles.introduction}>
          <AppText variant="heading03">여행의 순간을 기록해요</AppText>
          <AppText tone="tertiary" variant="body02">
            사진으로 방문지를 찾고 나만의 여행 지도를 채워 보세요.
          </AppText>
        </View>

        <View style={styles.actions}>
          {showAppleLogin ? (
            <View
              pointerEvents={isBusy ? "none" : "auto"}
              style={isBusy ? styles.disabled : undefined}
            >
              <AppleAuthentication.AppleAuthenticationButton
                buttonStyle={
                  AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                }
                buttonType={
                  AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
                }
                cornerRadius={radii.large}
                onPress={() => void startAppleLogin()}
                style={styles.appleButton}
              />
              {activeLogin === "APPLE" ? (
                <View pointerEvents="none" style={styles.appleLoading}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                </View>
              ) : null}
            </View>
          ) : null}

          <Pressable
            accessibilityHint="카카오 계정으로 로그인합니다."
            accessibilityLabel="카카오로 시작하기"
            accessibilityRole="button"
            accessibilityState={{ disabled: isBusy }}
            disabled={isBusy}
            onPress={() => void startKakaoLogin()}
            style={({ pressed }) => [
              styles.kakaoButton,
              isBusy && styles.disabled,
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

            {activeLogin === "KAKAO" ? (
              <ActivityIndicator
                color={semanticColors.text.primary}
                size="small"
              />
            ) : (
              <AppText style={styles.label} variant="button03">
                카카오로 시작하기
              </AppText>
            )}
          </Pressable>

          <Pressable
            accessibilityLabel="로그인 없이 둘러보기"
            accessibilityRole="button"
            accessibilityState={{ disabled: isBusy }}
            disabled={isBusy}
            onPress={() => void startAsGuest()}
            style={({ pressed }) => [
              styles.guestButton,
              isBusy && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            {isEnteringGuestMode ? (
              <ActivityIndicator
                color={semanticColors.text.secondary}
                size="small"
              />
            ) : (
              <AppText tone="secondary" variant="button05">
                로그인 없이 둘러보기
              </AppText>
            )}
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.sm,
  },
  appleButton: {
    height: 60,
    width: "100%",
  },
  appleLoading: {
    alignItems: "center",
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
    borderRadius: radii.large,
    justifyContent: "center",
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xxl * 2,
  },
  disabled: {
    opacity: 0.64,
  },
  guestButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  introduction: {
    gap: spacing.sm,
    paddingTop: spacing.xxl,
  },
  kakaoButton: {
    alignItems: "center",
    backgroundColor: "#FEE500",
    borderRadius: radii.large,
    justifyContent: "center",
    minHeight: 60,
    paddingVertical: spacing.md,
    position: "relative",
    width: "100%",
  },
  label: {
    flexShrink: 1,
    paddingHorizontal: spacing.xxl * 2,
    textAlign: "center",
    width: "100%",
  },
  pressed: {
    opacity: 0.72,
  },
  symbolBackground: {
    alignItems: "center",
    borderRadius: radii.pill,
    height: 28,
    justifyContent: "center",
    left: spacing.xl,
    position: "absolute",
    width: 28,
  },
});
