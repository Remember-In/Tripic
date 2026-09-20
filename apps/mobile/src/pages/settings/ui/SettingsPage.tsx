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
  const { isAuthenticated, logout, status } = useAuthSession();
  const ownerKey = useLocalRecordOwnerKey();
  const clearRecords = useClearLocalRecordsMutation();
  const [isDeletingRecords, setIsDeletingRecords] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  const performClearRecords = async () => {
    if (!ownerKey || isDeletingRecords) return;
    setIsDeletingRecords(true);
    try {
      const result = await clearRecords.mutateAsync({ ownerKey });
      Alert.alert(
        "초기화했어요",
        result.photoCleanup.deferred || result.photoCleanup.failedCount > 0
          ? "기록은 삭제했어요. 일부 사진 사본은 다음 실행 때 다시 정리할게요."
          : "저장된 여행 기록과 사진 사본을 모두 삭제했어요.",
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
      "모든 여행 기록과 지도 방문 표시가 사라지며 복구할 수 없어요.",
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
    if (isLoggingOut) return;
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
          <SettingsSection title="개인정보 · 데이터">
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
          </SettingsSection>

          <SettingsSection title="기록 관리">
            <SettingsRow
              label="기록 데이터 삭제"
              onPress={() => router.push("/records" as Href)}
            />
            <SettingsRow
              disabled={isDeletingRecords}
              label="전체 기록 초기화"
              loading={isDeletingRecords}
              onPress={confirmClearRecords}
              tone="destructive"
            />
          </SettingsSection>

          <SettingsSection title="로그인">
            {isAuthenticated ? (
              <>
                <SettingsRow
                  disabled={isLoggingOut}
                  label="로그아웃"
                  loading={isLoggingOut}
                  onPress={confirmLogout}
                />
                <SettingsRow
                  label="회원탈퇴"
                  onPress={() => router.push("/settings/withdrawal" as Href)}
                  tone="destructive"
                />
              </>
            ) : (
              <SettingsRow
                disabled={status === "restoring"}
                label="Apple 또는 카카오로 로그인"
                loading={status === "restoring"}
                onPress={() => router.push("/login" as Href)}
              />
            )}
          </SettingsSection>
        </ScrollView>
      </View>
    </Screen>
  );
}

function SettingsSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <View style={styles.section}>
      <AppText style={styles.sectionTitle} tone="tertiary" variant="caption02">
        {title}
      </AppText>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    minHeight: 48,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    paddingLeft: spacing.xs,
  },
  sections: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
});
