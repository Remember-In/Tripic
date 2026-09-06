import { type Href, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import {
  PhotoStrip,
  useCreateRecordSession,
} from "@/features/create-record-session";
import { radii, semanticColors, spacing } from "@/shared/config/theme";
import { AppText, PageHeader, PrimaryButton, Screen } from "@/shared/ui";

const photoInfoRoute = "/records/new/photo-info" as Href;
const composeRoute = "/records/new/compose" as Href;

export function PlaceConfirmationPage() {
  const router = useRouter();
  const { getPhotoDetails, photos, selectPhotoForInfo, visits } =
    useCreateRecordSession();
  const [isEditing, setIsEditing] = useState(false);
  const hasUnconfirmedPhoto = photos.some(
    (photo) => !getPhotoDetails(photo.id).place,
  );

  const handleBack = () => {
    if (isEditing) {
      setIsEditing(false);
      return;
    }

    router.back();
  };

  const handleBottomButton = () => {
    if (isEditing) {
      setIsEditing(false);
      return;
    }

    const unconfirmedPhoto = photos.find(
      (photo) => !getPhotoDetails(photo.id).place,
    );
    if (unconfirmedPhoto) {
      selectPhotoForInfo(unconfirmedPhoto.id);
      router.push(photoInfoRoute);
      return;
    }

    router.push(composeRoute);
  };

  return (
    <Screen>
      <View style={styles.container}>
        <PageHeader
          onBackPress={handleBack}
          title={isEditing ? "수정/추가" : "여행지 확인"}
        />

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
        >
          <View style={styles.photoCard}>
            <View style={styles.photoStripViewport}>
              <PhotoStrip
                onPhotoPress={(photo) => {
                  selectPhotoForInfo(photo.id);
                  router.push(photoInfoRoute);
                }}
                photos={photos}
              />
            </View>
          </View>

          {!isEditing ? (
            <View style={styles.visitCard}>
              <View style={styles.visitCardHeader}>
                <AppText style={styles.visitCardTitle} variant="subtitle02">
                  방문 정보
                </AppText>
                <Pressable
                  accessibilityLabel="방문 정보 수정 또는 추가"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => setIsEditing(true)}
                  style={styles.editButton}
                >
                  <AppText
                    style={styles.informationText}
                    variant="subtitle04"
                  >
                    수정/추가
                  </AppText>
                </Pressable>
              </View>
              <View style={styles.visitRows}>
                {visits.map((visit) => (
                  <View key={visit.id} style={styles.visitRow}>
                    <AppText
                      numberOfLines={1}
                      style={styles.visitName}
                      tone="secondary"
                      variant="subtitle03"
                    >
                      {visit.name}
                    </AppText>
                    <AppText
                      numberOfLines={1}
                      style={styles.visitDate}
                      tone="placeholder"
                      variant="subtitle04"
                    >
                      {visit.date}
                    </AppText>
                  </View>
                ))}
                {visits.length === 0 ? (
                  <AppText tone="placeholder" variant="subtitle04">
                    사진의 방문 장소를 확인해 주세요.
                  </AppText>
                ) : null}
              </View>
            </View>
          ) : null}
        </ScrollView>

        <PrimaryButton
          label={
            isEditing
              ? "수정 완료"
              : hasUnconfirmedPhoto
                ? "장소 확인하기"
                : "다음"
          }
          onPress={handleBottomButton}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  content: {
    paddingBottom: spacing.lg,
  },
  editButton: {
    alignItems: "center",
    flexShrink: 0,
    justifyContent: "center",
    minHeight: 44,
  },
  informationText: {
    color: semanticColors.feedback.information.level1,
  },
  photoCard: {
    backgroundColor: semanticColors.background.surface,
    borderRadius: radii.large,
    height: 103,
    justifyContent: "center",
    marginTop: spacing.lg,
    overflow: "hidden",
    paddingHorizontal: 14,
  },
  photoStripViewport: {
    height: 72,
  },
  scrollView: {
    flex: 1,
  },
  visitCard: {
    backgroundColor: semanticColors.background.surface,
    borderRadius: radii.large,
    minHeight: 128,
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  visitCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  visitCardTitle: {
    flex: 1,
    minWidth: 0,
  },
  visitDate: {
    flexShrink: 0,
  },
  visitName: {
    flex: 1,
    minWidth: 0,
  },
  visitRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  visitRows: {
    gap: spacing.xs,
    marginTop: spacing.md,
  },
});
