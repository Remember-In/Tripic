import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";

import { getTravelRecord } from "@/entities/travel-record";
import { useCreateRecordSession } from "@/features/create-record-session";
import { EditIcon } from "@/shared/assets/icons";
import { palette, radii, semanticColors, spacing } from "@/shared/config/theme";
import { AppText, PageHeader, Screen } from "@/shared/ui";
import { TripItinerary } from "@/widgets/trip-itinerary";

import { PlaceInfoSheet } from "./PlaceInfoSheet";

export function RecordDetailPage() {
  const router = useRouter();
  const { completedRecord } = useCreateRecordSession();
  const params = useLocalSearchParams<{ recordId?: string | string[] }>();
  const recordId = Array.isArray(params.recordId)
    ? params.recordId[0]
    : (params.recordId ?? "gyeongju");
  const record =
    recordId === "draft" && completedRecord
      ? completedRecord
      : getTravelRecord(recordId);
  const [isPlaceSheetVisible, setPlaceSheetVisible] = useState(false);

  const goBack = () => {
    if (recordId === "draft") {
      router.replace("/records" as Href);
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/records" as Href);
  };

  const openEdit = () => {
    setPlaceSheetVisible(false);
    router.push(`/records/${recordId}/edit` as Href);
  };

  const confirmPlaceDelete = () => {
    Alert.alert(
      "장소 기록을 삭제할까요?",
      "삭제하면 여행 일정에서 이 장소와 사진이 사라져요.",
      [
        { style: "cancel", text: "취소" },
        {
          onPress: () =>
            Alert.alert(
              "프로토타입 안내",
              "현재 화면에서는 실제 기록을 삭제하지 않아요.",
            ),
          style: "destructive",
          text: "삭제",
        },
      ],
    );
  };

  return (
    <Screen>
      <View style={styles.page}>
        <PageHeader
          actionAccessibilityLabel="기록 수정"
          actionIcon={EditIcon}
          onActionPress={openEdit}
          onBackPress={goBack}
          style={styles.header}
          title="기록"
        />

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.titleCard}>
            <AppText variant="subtitle03">{record.title}</AppText>
          </View>

          <TripItinerary
            days={record.days}
            onPhotoPress={() => setPlaceSheetVisible(true)}
          />

          <View style={styles.tagsSection}>
            <AppText
              style={styles.sectionTitle}
              tone="tertiary"
              variant="subtitle03"
            >
              해시태그
            </AppText>
            <View style={styles.tagsCard}>
              {record.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <AppText tone="secondary" variant="caption02">
                    {tag}
                  </AppText>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>

      <PlaceInfoSheet
        onClose={() => setPlaceSheetVisible(false)}
        onDelete={confirmPlaceDelete}
        onEdit={openEdit}
        place={record.place}
        visible={isPlaceSheetVisible}
      />
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
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
  titleCard: {
    backgroundColor: semanticColors.background.surface,
    borderRadius: radii.large,
    padding: spacing.md,
  },
  tagsSection: {
    gap: spacing.xs,
  },
  sectionTitle: {
    paddingLeft: spacing.sm,
  },
  tagsCard: {
    backgroundColor: semanticColors.background.surface,
    borderRadius: radii.large,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 18,
  },
  tag: {
    backgroundColor: palette.gray[50],
    borderRadius: radii.small,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
});
