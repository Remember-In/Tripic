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

import { createUserLocalRecordOwnerKey } from "@/entities/travel-record";
import { deleteMe } from "@/entities/user";
import { withdrawAccountOnDevice } from "@/features/account-withdrawal";
import { useAuthSession } from "@/features/auth-session";
import {
  useClearLocalRecordsMutation,
  useLocalRecordOwnerKey,
} from "@/features/local-records";
import { ChevronRightIcon } from "@/shared/assets/icons";
import { radii, semanticColors, spacing } from "@/shared/config/theme";
import { AppText, PageHeader, Screen } from "@/shared/ui";

type SettingsRowProps = {
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
  tone?: "default" | "destructive";
};

function SettingsRow({
  disabled = false,
  label,
  loading = false,
  onPress,
  tone = "default",
}: SettingsRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <AppText
        style={tone === "destructive" ? styles.destructiveText : undefined}
        tone={tone === "default" ? "secondary" : undefined}
        variant="button06"
      >
        {label}
      </AppText>
      {loading ? (
        <ActivityIndicator
          color={
            tone === "destructive"
              ? semanticColors.feedback.error.level1
              : semanticColors.brand.primary
          }
          size="small"
        />
      ) : (
        <ChevronRightIcon height={16} width={16} />
      )}
    </Pressable>
  );
}

export function SettingsPage() {
  const router = useRouter();
  const {
    clearLocalSession,
    isAuthenticated,
    logout,
    provider,
    retrySessionRestore,
    status,
    user,
  } = useAuthSession();
  const ownerKey = useLocalRecordOwnerKey();
  const accountOwnerKey = user ? createUserLocalRecordOwnerKey(user.id) : null;
  const clearRecords = useClearLocalRecordsMutation();
  const [isDeletingRecords, setIsDeletingRecords] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isWithdrawingAccount, setIsWithdrawingAccount] = useState(false);
  const isAccountActionPending = isLoggingOut || isWithdrawingAccount;

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/");
  };

  const performClearRecords = async () => {
    if (!ownerKey || isDeletingRecords || isWithdrawingAccount) {
      return;
    }

    setIsDeletingRecords(true);
    try {
      const result = await clearRecords.mutateAsync({ ownerKey });
      Alert.alert(
        "초기화했어요",
        result.photoCleanup.deferred || result.photoCleanup.failedCount > 0
          ? "기록은 삭제했어요. 일부 사진 사본은 다음 실행 때 다시 정리할게요."
          : "현재 이용 영역에 저장된 여행 기록과 사진 사본을 삭제했어요.",
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
      "현재 이용 영역의 모든 여행 기록과 지도 스탬프가 사라지며 복구할 수 없어요.",
      [
        { style: "cancel", text: "취소" },
        {
          onPress: () => void performClearRecords(),
          style: "destructive",
          text: "초기화",
        },
      ],
    );
  };

  const performLogout = async () => {
    if (isAccountActionPending) {
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

  const performAccountWithdrawal = async () => {
    if (
      !accountOwnerKey ||
      isDeletingRecords ||
      isLoggingOut ||
      isWithdrawingAccount
    ) {
      return;
    }

    setIsWithdrawingAccount(true);
    try {
      const result = await withdrawAccountOnDevice({
        clearLocalData: async () => {
          const cleanup = await clearRecords.mutateAsync({
            ownerKey: accountOwnerKey,
          });

          return cleanup.photoCleanup.deferred ||
            cleanup.photoCleanup.failedCount > 0
            ? "photo-cleanup-pending"
            : "complete";
        },
        clearLocalSession,
        deleteRemoteAccount: deleteMe,
        ownerKey: accountOwnerKey,
      });

      router.replace("/login");

      if (
        result.localDataCleanup === "complete" &&
        result.localSessionCleaned
      ) {
        Alert.alert(
          "탈퇴했어요",
          "계정과 현재 계정으로 저장한 기기 내 여행 기록을 삭제했어요.",
        );
      } else {
        Alert.alert(
          "계정은 삭제됐어요",
          "기기 내 일부 데이터 정리는 다음 앱 실행 때 다시 시도할게요.",
        );
      }
    } catch {
      Alert.alert(
        "탈퇴를 완료하지 못했어요",
        "네트워크를 확인한 뒤 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsWithdrawingAccount(false);
    }
  };

  const confirmAccountWithdrawalAgain = () => {
    Alert.alert(
      "정말 탈퇴할까요?",
      "계정과 현재 계정의 기기 내 기록을 삭제합니다. 이 작업은 되돌릴 수 없어요.",
      [
        { style: "cancel", text: "돌아가기" },
        {
          onPress: () => void performAccountWithdrawal(),
          style: "destructive",
          text: "계정 삭제",
        },
      ],
    );
  };

  const confirmAccountWithdrawal = () => {
    if (isDeletingRecords || isAccountActionPending) {
      return;
    }

    Alert.alert(
      "회원 탈퇴할까요?",
      "서버 계정과 로그인 정보, 현재 계정의 기기 내 기록이 삭제돼요.",
      [
        { style: "cancel", text: "취소" },
        {
          onPress: confirmAccountWithdrawalAgain,
          style: "destructive",
          text: "계속",
        },
      ],
    );
  };

  return (
    <Screen>
      <View style={styles.page}>
        <PageHeader
          onBackPress={goBack}
          style={styles.header}
          title="설정"
          titleVariant="heading03"
        />

        <ScrollView
          contentContainerStyle={styles.sections}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <AppText
              style={styles.sectionTitle}
              tone="tertiary"
              variant="caption02"
            >
              계정
            </AppText>

            {isAuthenticated ? (
              <View style={styles.card}>
                <View style={styles.accountInfo}>
                  <AppText variant="button03">
                    {user?.nickname ?? "닉네임 미설정"}
                  </AppText>
                  <AppText tone="tertiary" variant="caption02">
                    {provider === "APPLE" ? "Apple" : "카카오"} 계정으로 로그인됨
                  </AppText>
                </View>
                {!user?.nickname ? (
                  <SettingsRow
                    label="닉네임 설정"
                    onPress={() => router.push("/onboarding/nickname" as Href)}
                  />
                ) : null}
                <SettingsRow
                  disabled={isAccountActionPending}
                  label="로그아웃"
                  loading={isLoggingOut}
                  onPress={confirmLogout}
                  tone="destructive"
                />
                <SettingsRow
                  disabled={
                    isDeletingRecords || isLoggingOut || isWithdrawingAccount
                  }
                  label="회원 탈퇴"
                  loading={isWithdrawingAccount}
                  onPress={confirmAccountWithdrawal}
                  tone="destructive"
                />
              </View>
            ) : status === "guest" || status === "unauthenticated" ? (
              <View style={styles.card}>
                {status === "guest" ? (
                  <View style={styles.accountInfo}>
                    <AppText variant="button03">게스트로 이용 중</AppText>
                    <AppText tone="tertiary" variant="caption02">
                      로그인하면 계정별로 기록을 분리해 이용할 수 있어요.
                    </AppText>
                  </View>
                ) : null}
                <SettingsRow
                  label="Apple 또는 카카오로 로그인"
                  onPress={() => router.push("/login" as Href)}
                />
              </View>
            ) : status === "unavailable" ? (
              <View style={styles.card}>
                <View style={styles.accountInfo}>
                  <AppText variant="button03">
                    로그인 상태를 확인하지 못했어요
                  </AppText>
                  <AppText tone="tertiary" variant="caption02">
                    저장된 로그인 정보는 유지되고 있어요.
                  </AppText>
                </View>
                <SettingsRow
                  label="다시 확인"
                  onPress={() => void retrySessionRestore()}
                />
              </View>
            ) : (
              <View style={styles.card}>
                <View style={styles.row}>
                  <AppText tone="secondary" variant="button06">
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
              variant="caption02"
            >
              개인정보 · 데이터
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
                label="지도 데이터 출처"
                onPress={() => router.push("/settings/map-data" as Href)}
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
              variant="caption02"
            >
              기록 관리
            </AppText>
            <View style={styles.card}>
              <SettingsRow
                label="기록 데이터 삭제"
                onPress={() => router.push("/records" as Href)}
              />
              <SettingsRow
                disabled={isDeletingRecords || isWithdrawingAccount}
                label="전체 기록 초기화"
                loading={isDeletingRecords}
                onPress={confirmClearRecords}
                tone="destructive"
              />
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
    paddingVertical: spacing.xs,
  },
  card: {
    backgroundColor: semanticColors.background.surface,
    borderRadius: radii.medium,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  destructiveText: {
    color: semanticColors.feedback.error.level1,
  },
  header: {
    marginBottom: spacing.lg,
  },
  page: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: 3,
  },
  pressed: {
    opacity: 0.6,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    paddingLeft: spacing.xs,
  },
  sections: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
});
