import { type Href, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { useAuthSession } from "@/features/auth-session";
import {
  useClearLocalRecordsMutation,
  useLocalRecordOwnerKey,
} from "@/features/local-records";
import { ChevronRightIcon } from "@/shared/assets/icons";
import { radii, semanticColors, spacing } from "@/shared/config/theme";
import { AppText, PageHeader, Screen } from "@/shared/ui";

type SettingsRowProps = {
  label: string;
  onPress: () => void;
};

function SettingsRow({ label, onPress }: SettingsRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <AppText tone="secondary" variant="subtitle03">
        {label}
      </AppText>
      <ChevronRightIcon height={16} width={16} />
    </Pressable>
  );
}

export function SettingsPage() {
  const router = useRouter();
  const { isAuthenticated, logout, retrySessionRestore, status, user } =
    useAuthSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeletingRecords, setIsDeletingRecords] = useState(false);
  const ownerKey = useLocalRecordOwnerKey();
  const clearRecords = useClearLocalRecordsMutation();

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/");
  };

  const performClearRecords = async () => {
    if (!ownerKey || isDeletingRecords) {
      return;
    }

    setIsDeletingRecords(true);
    try {
      const result = await clearRecords.mutateAsync({ ownerKey });
      Alert.alert(
        "초기화했어요",
        result.photoCleanup.deferred || result.photoCleanup.failedCount > 0
          ? "기록은 삭제했어요. 일부 사진 사본은 다음 실행 때 다시 정리할게요."
          : "이 계정의 로컬 여행 기록과 사진 사본을 삭제했어요.",
      );
    } catch {
      Alert.alert("초기화하지 못했어요", "잠시 후 다시 시도해 주세요.");
    } finally {
      setIsDeletingRecords(false);
    }
  };

  const confirmClearRecords = () => {
    Alert.alert(
      "전체 기록을 초기화할까요?",
      "이 계정의 모든 여행 기록과 지도 스탬프가 사라지며 복구할 수 없어요.",
      [
        { style: "cancel", text: "취소" },
        {
          onPress: () => void performClearRecords(),
          style: "destructive",
          text: "삭제",
        },
      ],
    );
  };

  const performLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      await logout();
    } catch {
      Alert.alert(
        "서버에 연결하지 못했어요",
        "이 기기에서는 로그아웃됐어요. 네트워크 연결 후 다시 로그인해 주세요.",
      );
    } finally {
      setIsLoggingOut(false);
      router.replace("/login");
    }
  };

  const confirmLogout = () => {
    Alert.alert("로그아웃할까요?", "이 기기의 로그인 정보가 삭제됩니다.", [
      { style: "cancel", text: "취소" },
      {
        onPress: () => void performLogout(),
        style: "destructive",
        text: "로그아웃",
      },
    ]);
  };

  return (
    <Screen>
      <View style={styles.page}>
        <PageHeader onBackPress={goBack} style={styles.header} title="설정" />

        <ScrollView
          contentContainerStyle={styles.sections}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <AppText
              style={styles.sectionTitle}
              tone="tertiary"
              variant="subtitle03"
            >
              계정
            </AppText>
            {isAuthenticated ? (
              <View style={styles.card}>
                <View style={styles.accountInfo}>
                  <AppText variant="subtitle03">
                    {user?.nickname ?? "닉네임 미설정"}
                  </AppText>
                  <AppText tone="tertiary" variant="caption02">
                    카카오 계정으로 로그인됨
                  </AppText>
                </View>
                {!user?.nickname ? (
                  <SettingsRow
                    label="닉네임 설정"
                    onPress={() => router.push("/onboarding/nickname" as Href)}
                  />
                ) : null}
                <Pressable
                  accessibilityLabel="로그아웃"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isLoggingOut }}
                  disabled={isLoggingOut}
                  onPress={confirmLogout}
                  style={({ pressed }) => [
                    styles.row,
                    pressed && styles.pressed,
                  ]}
                >
                  <AppText style={styles.logoutText} variant="subtitle03">
                    로그아웃
                  </AppText>
                  {isLoggingOut ? (
                    <ActivityIndicator
                      color={semanticColors.feedback.error.level1}
                      size="small"
                    />
                  ) : null}
                </Pressable>
              </View>
            ) : status === "unauthenticated" ? (
              <View style={styles.card}>
                <SettingsRow
                  label="카카오로 로그인"
                  onPress={() => router.push("/login")}
                />
              </View>
            ) : status === "unavailable" ? (
              <View style={styles.card}>
                <View style={styles.accountInfo}>
                  <AppText variant="subtitle03">
                    로그인 상태를 확인하지 못했어요
                  </AppText>
                  <AppText tone="tertiary" variant="caption02">
                    저장된 로그인 정보는 유지되고 있어요. 네트워크를 확인한 뒤
                    다시 시도해 주세요.
                  </AppText>
                </View>
                <Pressable
                  accessibilityLabel="로그인 상태 다시 확인"
                  accessibilityRole="button"
                  onPress={() => void retrySessionRestore()}
                  style={({ pressed }) => [
                    styles.row,
                    pressed && styles.pressed,
                  ]}
                >
                  <AppText style={styles.retryText} variant="subtitle03">
                    다시 확인
                  </AppText>
                </Pressable>
              </View>
            ) : (
              <View style={styles.card}>
                <View style={styles.row}>
                  <AppText tone="secondary" variant="subtitle03">
                    로그인 상태 확인 중
                  </AppText>
                  <ActivityIndicator
                    color={semanticColors.brand.primary}
                    size="small"
                  />
                </View>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <AppText
              style={styles.sectionTitle}
              tone="tertiary"
              variant="subtitle03"
            >
              개인정보・데이터
            </AppText>
            <View style={styles.card}>
              <SettingsRow
                label="위치 정보 활용 안내"
                onPress={() =>
                  router.push("/settings/location-information" as Href)
                }
              />
              <SettingsRow
                label="EXIF 사용 안내"
                onPress={() => router.push("/settings/photo-metadata" as Href)}
              />
              <SettingsRow
                label="개인정보 처리방침"
                onPress={() => router.push("/settings/privacy-policy" as Href)}
              />
              <SettingsRow
                label="서비스 이용약관"
                onPress={() =>
                  router.push("/settings/terms-of-service" as Href)
                }
              />
            </View>
          </View>

          <View style={styles.section}>
            <AppText
              style={styles.sectionTitle}
              tone="tertiary"
              variant="subtitle03"
            >
              기록 관리
            </AppText>
            <View style={styles.card}>
              <SettingsRow
                label="개별 기록 관리"
                onPress={() => router.push("/records")}
              />
              <Pressable
                accessibilityLabel="전체 기록 초기화"
                accessibilityRole="button"
                accessibilityState={{ disabled: isDeletingRecords }}
                disabled={isDeletingRecords}
                onPress={confirmClearRecords}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <AppText style={styles.logoutText} variant="subtitle03">
                  전체 기록 초기화
                </AppText>
                {isDeletingRecords ? (
                  <ActivityIndicator
                    color={semanticColors.feedback.error.level1}
                    size="small"
                  />
                ) : null}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  accountInfo: {
    gap: spacing.xxs,
    minHeight: 44,
  },
  page: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: 3,
  },
  header: {
    marginBottom: spacing.lg,
  },
  sections: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    paddingLeft: spacing.sm,
  },
  card: {
    backgroundColor: semanticColors.background.surface,
    borderRadius: radii.large,
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
  },
  pressed: {
    opacity: 0.6,
  },
  retryText: {
    color: semanticColors.brand.primary,
  },
  logoutText: {
    color: semanticColors.feedback.error.level1,
  },
});
