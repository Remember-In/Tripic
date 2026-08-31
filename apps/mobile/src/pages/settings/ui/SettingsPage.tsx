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

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/");
  };

  const showGuide = (title: string, message: string) => {
    Alert.alert(title, message, [{ text: "확인" }]);
  };

  const confirmDelete = (title: string, message: string) => {
    Alert.alert(title, message, [
      { style: "cancel", text: "취소" },
      {
        onPress: () =>
          Alert.alert(
            "프로토타입 안내",
            "현재 화면에서는 실제 기록 데이터를 삭제하지 않아요.",
          ),
        style: "destructive",
        text: "삭제",
      },
    ]);
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
                  showGuide(
                    "위치 정보 활용 안내",
                    "사진 속 위치 정보는 기기에서 관광지 후보를 찾는 용도로만 사용해요. GPS 좌표는 Tripic 서버에 보내거나 저장하지 않아요.",
                  )
                }
              />
              <SettingsRow
                label="EXIF 사용 안내"
                onPress={() =>
                  showGuide(
                    "EXIF 사용 안내",
                    "사진의 촬영 위치와 시간 정보는 기기에서 분석해 방문 장소를 제안하는 데 사용해요. 사진 원본과 EXIF 정보는 Tripic 서버에 보내지 않아요.",
                  )
                }
              />
              <SettingsRow
                label="개인정보 처리방침"
                onPress={() =>
                  showGuide(
                    "개인정보 처리방침",
                    "사진 원본과 GPS·EXIF 정보는 Tripic 서버에 전송하지 않아요. 계정·프로필과 사용자가 확정한 기록 콘텐츠는 기기 간 동기화 대상이 될 수 있어요. 배포 전 공개 HTTPS 전문 주소를 연결해야 해요.",
                  )
                }
              />
              <SettingsRow
                label="서비스 이용약관"
                onPress={() =>
                  showGuide(
                    "서비스 이용약관",
                    "Tripic은 카카오 로그인으로 계정·프로필을 관리하고, 사용자가 확정한 기록 콘텐츠를 동기화할 수 있어요. 배포 전 공개 HTTPS 전문 주소를 연결해야 해요.",
                  )
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
                label="기록 데이터 삭제"
                onPress={() =>
                  confirmDelete(
                    "기록 데이터를 삭제할까요?",
                    "선택한 기록은 삭제 후 복구할 수 없어요.",
                  )
                }
              />
              <SettingsRow
                label="전체 기록 초기화"
                onPress={() =>
                  confirmDelete(
                    "전체 기록을 초기화할까요?",
                    "모든 여행 기록과 지도 스탬프가 사라지며 복구할 수 없어요.",
                  )
                }
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
