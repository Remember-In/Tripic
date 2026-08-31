import { type Href, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import {
  PhotoStrip,
  useCreateRecordSession,
} from "@/features/create-record-session";
import { radii, semanticColors, spacing } from "@/shared/config/theme";
import { AppText, PageHeader, PrimaryButton, Screen } from "@/shared/ui";

const photoInfoRoute = "/records/new/photo-info" as Href;
const aiSettingsRoute = "/records/new/ai-settings" as Href;

export function PlaceConfirmationPage() {
  const router = useRouter();
  const { photos, selectPhotoForInfo, visits } = useCreateRecordSession();
  const [isEditing, setIsEditing] = useState(false);

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

    router.push(aiSettingsRoute);
  };

  return (
    <Screen>
      <View style={styles.container}>
        <PageHeader
          onBackPress={handleBack}
          title={isEditing ? "수정/추가" : "여행지 확인"}
        />

        <View style={styles.photoCard}>
          <PhotoStrip
            onPhotoPress={
              isEditing
                ? (photo) => {
                    selectPhotoForInfo(photo.id);
                    router.push(photoInfoRoute);
                  }
                : undefined
            }
            photos={photos}
          />
        </View>

        {!isEditing ? (
          <View style={styles.visitCard}>
            <View style={styles.visitCardHeader}>
              <AppText variant="subtitle02">방문 정보</AppText>
              <Pressable
                accessibilityLabel="방문 정보 수정 또는 추가"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setIsEditing(true)}
              >
                <AppText style={styles.informationText} variant="subtitle04">
                  수정/추가
                </AppText>
              </Pressable>
            </View>
            <View style={styles.visitRows}>
              {visits.slice(0, 3).map((visit) => (
                <View key={visit.id} style={styles.visitRow}>
                  <AppText
                    numberOfLines={1}
                    style={styles.visitName}
                    tone="secondary"
                    variant="subtitle03"
                  >
                    {visit.name}
                  </AppText>
                  <AppText tone="placeholder" variant="subtitle04">
                    {visit.date}
                  </AppText>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <PrimaryButton
          label={isEditing ? "수정 완료" : "다음"}
          onPress={handleBottomButton}
          style={styles.bottomButton}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bottomButton: {
    bottom: 0,
    left: spacing.md,
    position: "absolute",
    right: spacing.md,
    width: "auto",
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
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
    justifyContent: "space-between",
  },
  visitName: {
    flex: 1,
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
