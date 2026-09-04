import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import type { UpdateLocalTravelRecordInput } from "@/entities/travel-record";
import {
  mapLocalRecordToDisplay,
  useDeleteLocalRecordMutation,
  useLocalRecordQuery,
  useUpdateLocalRecordMutation,
} from "@/features/local-records";
import { SettingsIcon } from "@/shared/assets/icons";
import { semanticColors, spacing } from "@/shared/config/theme";
import { AppText, PageHeader, Screen } from "@/shared/ui";
import { RecordEditor, type RecordEditorValue } from "@/widgets/record-editor";

export function RecordEditPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ recordId?: string | string[] }>();
  const recordId = Array.isArray(params.recordId)
    ? params.recordId[0]
    : params.recordId;
  const recordQuery = useLocalRecordQuery(recordId);
  const updateRecord = useUpdateLocalRecordMutation();
  const deleteRecord = useDeleteLocalRecordMutation();
  const [isSaving, setIsSaving] = useState(false);
  const localRecord = recordQuery.data ?? null;
  const record = localRecord ? mapLocalRecordToDisplay(localRecord) : null;

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (recordId) {
      router.replace({
        params: { recordId },
        pathname: "/records/[recordId]",
      });
      return;
    }
    router.replace("/records");
  };

  const submit = async (value: RecordEditorValue) => {
    if (!localRecord || isSaving) {
      return;
    }
    setIsSaving(true);

    const input: UpdateLocalTravelRecordInput = {
      days: localRecord.days.map((day) => ({
        ...day,
        note: value.notes[day.id] ?? null,
      })),
      id: localRecord.id,
      style: localRecord.style,
      tags: value.tags,
      theme: localRecord.theme,
      title: value.title,
    };

    try {
      await updateRecord.mutateAsync({
        input,
        ownerKey: localRecord.ownerKey,
      });
      Alert.alert("수정 완료", "여행 기록을 수정했어요.", [
        { onPress: goBack, text: "확인" },
      ]);
    } catch {
      Alert.alert("수정하지 못했어요", "잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSaving(false);
    }
  };

  const performDelete = async () => {
    if (!localRecord || isSaving) {
      return;
    }
    setIsSaving(true);
    try {
      const result = await deleteRecord.mutateAsync({
        ownerKey: localRecord.ownerKey,
        recordId: localRecord.id,
      });
      router.replace("/records");
      if (result.photoCleanup.deferred || result.photoCleanup.failedCount > 0) {
        Alert.alert(
          "기록을 삭제했어요",
          "일부 사진 사본은 다음 실행 때 다시 정리할게요.",
        );
      }
    } catch {
      Alert.alert("기록을 삭제하지 못했어요", "잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      "이 기록을 삭제할까요?",
      "사진 사본과 여행 기록이 기기에서 삭제되며 복구할 수 없어요.",
      [
        { style: "cancel", text: "취소" },
        {
          onPress: () => void performDelete(),
          style: "destructive",
          text: "삭제",
        },
      ],
    );
  };

  if (recordQuery.isPending) {
    return (
      <EditState loading message="기록을 불러오고 있어요." onBack={goBack} />
    );
  }

  if (recordQuery.isError) {
    return (
      <EditState
        message="기록을 불러오지 못했어요."
        onBack={goBack}
        onRetry={() => void recordQuery.refetch()}
      />
    );
  }

  if (!record || !localRecord) {
    return (
      <EditState message="삭제되었거나 없는 기록이에요." onBack={goBack} />
    );
  }

  return (
    <Screen>
      <View style={styles.page}>
        <PageHeader
          actionAccessibilityLabel="기록 삭제"
          actionIcon={SettingsIcon}
          onActionPress={confirmDelete}
          onBackPress={goBack}
          style={styles.header}
          title="기록 수정"
        />
        <RecordEditor
          key={localRecord.updatedAt}
          onSubmit={submit}
          record={record}
          submitting={isSaving}
        />
      </View>
    </Screen>
  );
}

type EditStateProps = {
  loading?: boolean;
  message: string;
  onBack: () => void;
  onRetry?: () => void;
};

function EditState({ loading, message, onBack, onRetry }: EditStateProps) {
  return (
    <Screen>
      <View style={styles.page}>
        <PageHeader onBackPress={onBack} title="기록 수정" />
        <View style={styles.state}>
          {loading ? (
            <ActivityIndicator
              color={semanticColors.brand.primary}
              size="small"
            />
          ) : null}
          <AppText tone="secondary" variant="body02">
            {message}
          </AppText>
          {onRetry ? (
            <Pressable accessibilityRole="button" onPress={onRetry}>
              <AppText style={styles.retryText} variant="button06">
                다시 시도
              </AppText>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.lg,
  },
  page: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: 3,
  },
  retryText: {
    color: semanticColors.brand.primary,
  },
  state: {
    alignItems: "center",
    flex: 1,
    gap: spacing.sm,
    justifyContent: "center",
  },
});
