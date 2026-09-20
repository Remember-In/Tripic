import { type Href, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { createUserLocalRecordOwnerKey } from "@/entities/travel-record";
import { deleteMe } from "@/entities/user";
import { withdrawAccountOnDevice } from "@/features/account-withdrawal";
import { useAuthSession } from "@/features/auth-session";
import {
  useClearLocalRecordsMutation,
  useLocalRecordStatsQuery,
} from "@/features/local-records";
import { ChevronRightIcon } from "@/shared/assets/icons";
import { palette, radii, semanticColors, spacing } from "@/shared/config/theme";
import { AppText, PageHeader, Screen } from "@/shared/ui";

export function AccountWithdrawalPage() {
  const router = useRouter();
  const { clearLocalSession, isAuthenticated, status, user } = useAuthSession();
  const clearRecords = useClearLocalRecordsMutation();
  const stats = useLocalRecordStatsQuery();
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  useEffect(() => {
    if (status === "restoring" || status === "unavailable") return;
    if (!isAuthenticated || !user) router.replace("/settings" as Href);
  }, [isAuthenticated, router, status, user]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/settings" as Href);
  };

  const withdraw = async () => {
    if (!user || isWithdrawing) return;
    setConfirmationVisible(false);
    setIsWithdrawing(true);
    const ownerKey = createUserLocalRecordOwnerKey(user.id);

    try {
      const result = await withdrawAccountOnDevice({
        clearLocalData: async () => {
          const cleanup = await clearRecords.mutateAsync({ ownerKey });
          return cleanup.photoCleanup.deferred ||
            cleanup.photoCleanup.failedCount > 0
            ? "photo-cleanup-pending"
            : "complete";
        },
        clearLocalSession,
        deleteRemoteAccount: deleteMe,
        ownerKey,
      });

      router.replace("/login" as Href);
      Alert.alert(
        "탈퇴했어요",
        result.localDataCleanup === "complete" && result.localSessionCleaned
          ? "계정과 기기에 저장된 여행 기록을 삭제했어요."
          : "계정은 삭제됐어요. 남은 기기 데이터는 다음 실행 때 다시 정리할게요.",
      );
    } catch {
      Alert.alert(
        "탈퇴를 완료하지 못했어요",
        "네트워크를 확인한 뒤 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <Screen>
      <View style={styles.page}>
        <PageHeader
          onBackPress={goBack}
          style={styles.header}
          title="회원탈퇴"
          titleVariant="heading03"
        />

        <View style={styles.content}>
          <AppText tone="secondary" variant="body02">
            탈퇴를 결정하시기 전, 아래 정보를 확인해주세요.
          </AppText>

          <View style={styles.card}>
            <AppText variant="subtitle02">
              지금까지 {stats.data?.visitedAreaCount ?? 0}지역의{" "}
              {stats.data?.visitedPlaceCount ?? 0}곳을 방문했어요.
            </AppText>
            <AppText tone="tertiary" variant="body02">
              Tripic을 탈퇴하면 방문 기록과 저장된 사진 정보가 모두 삭제되며
              다시 복구할 수 없어요.
            </AppText>
            <Pressable
              accessibilityLabel="내 방문 기록 보러가기"
              accessibilityRole="button"
              onPress={() => router.push("/records" as Href)}
              style={({ pressed }) => [
                styles.recordLink,
                pressed && styles.pressed,
              ]}
            >
              <AppText style={styles.recordLinkText} variant="button05">
                내 방문 기록 보러가기
              </AppText>
              <ChevronRightIcon height={16} width={16} />
            </Pressable>
          </View>

          <AppText tone="placeholder" variant="caption02">
            관련 법령에 따라 보관이 필요한 정보는 정해진 기간 동안 보관 후
            안전하게 파기됩니다.
          </AppText>
        </View>

        <View style={styles.actions}>
          <ActionButton label="취소" onPress={goBack} variant="cancel" />
          <ActionButton
            label="탈퇴"
            loading={isWithdrawing}
            onPress={() => setConfirmationVisible(true)}
            variant="destructive"
          />
        </View>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => setConfirmationVisible(false)}
        transparent
        visible={confirmationVisible}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <AppText style={styles.modalTitle} variant="subtitle02">
              정말 탈퇴하시겠어요?
            </AppText>
            <View style={styles.modalActions}>
              <ActionButton
                label="취소"
                onPress={() => setConfirmationVisible(false)}
                variant="cancel"
              />
              <ActionButton
                label="확인"
                onPress={() => void withdraw()}
                variant="destructive"
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function ActionButton({
  label,
  loading = false,
  onPress,
  variant,
}: {
  label: string;
  loading?: boolean;
  onPress: () => void;
  variant: "cancel" | "destructive";
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        variant === "cancel" ? styles.cancelButton : styles.destructiveButton,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.gray.white} size="small" />
      ) : (
        <AppText
          style={
            variant === "cancel"
              ? styles.cancelButtonText
              : styles.destructiveButtonText
          }
          variant="button03"
        >
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    borderRadius: radii.large,
    flex: 1,
    justifyContent: "center",
    minHeight: 56,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  cancelButton: {
    backgroundColor: palette.gray[200],
  },
  cancelButtonText: {
    color: semanticColors.text.secondary,
  },
  card: {
    backgroundColor: semanticColors.background.surface,
    borderRadius: radii.large,
    gap: spacing.md,
    padding: spacing.lg,
  },
  content: {
    flex: 1,
    gap: spacing.md,
  },
  destructiveButton: {
    backgroundColor: semanticColors.feedback.error.level1,
  },
  destructiveButtonText: {
    color: palette.gray.white,
  },
  header: {
    marginBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(17, 17, 17, 0.52)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  modalCard: {
    backgroundColor: semanticColors.background.surface,
    borderRadius: radii.large,
    gap: spacing.xl,
    maxWidth: 326,
    padding: spacing.lg,
    width: "100%",
  },
  modalTitle: {
    textAlign: "center",
  },
  page: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: 3,
  },
  pressed: {
    opacity: 0.68,
  },
  recordLink: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xxs,
  },
  recordLinkText: {
    color: semanticColors.brand.primary,
  },
});
