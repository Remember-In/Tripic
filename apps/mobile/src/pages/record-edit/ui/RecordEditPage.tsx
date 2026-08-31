import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { Alert, StyleSheet, View } from "react-native";

import { getTravelRecord } from "@/entities/travel-record";
import { useCreateRecordSession } from "@/features/create-record-session";
import { SettingsIcon } from "@/shared/assets/icons";
import { spacing } from "@/shared/config/theme";
import { PageHeader, Screen } from "@/shared/ui";
import { RecordEditor, type RecordEditorValue } from "@/widgets/record-editor";

export function RecordEditPage() {
  const router = useRouter();
  const { completedRecord, setCompletedRecord } = useCreateRecordSession();
  const params = useLocalSearchParams<{ recordId?: string | string[] }>();
  const recordId = Array.isArray(params.recordId)
    ? params.recordId[0]
    : (params.recordId ?? "gyeongju");
  const record =
    recordId === "draft" && completedRecord
      ? completedRecord
      : getTravelRecord(recordId);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(`/records/${recordId}` as Href);
  };

  const submit = (value: RecordEditorValue) => {
    if (recordId === "draft") {
      setCompletedRecord({
        ...record,
        days: record.days.map((day) => ({
          ...day,
          note: value.notes[day.id],
        })),
        tags: value.tags,
        title: value.title,
      });

      Alert.alert("수정 완료", "여행 기록을 수정했어요.", [
        { onPress: goBack, text: "확인" },
      ]);
      return;
    }

    Alert.alert(
      "프로토타입 안내",
      "예시 기록의 변경 내용은 아직 기기에 저장되지 않아요.",
      [{ onPress: goBack, text: "확인" }],
    );
  };

  return (
    <Screen>
      <View style={styles.page}>
        <PageHeader
          actionAccessibilityLabel="기록 설정 안내"
          actionIcon={SettingsIcon}
          onActionPress={() =>
            Alert.alert(
              "기록 설정",
              "장소별 정보는 기록 상세에서 사진을 눌러 수정할 수 있어요.",
            )
          }
          onBackPress={goBack}
          style={styles.header}
          title="기록 수정"
        />
        <RecordEditor onSubmit={submit} record={record} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: 3,
  },
  header: {
    marginBottom: spacing.lg,
  },
});
