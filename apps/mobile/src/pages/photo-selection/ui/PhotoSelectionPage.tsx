import { launchImageLibraryAsync } from "expo-image-picker";
import { type Href, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import {
  PhotoStrip,
  useCreateRecordSession,
} from "@/features/create-record-session";
import { PlusIcon } from "@/shared/assets/photo-flow";
import {
  palette,
  radii,
  semanticColors,
  shadows,
  spacing,
} from "@/shared/config/theme";
import { AppText, PageHeader, PrimaryButton, Screen } from "@/shared/ui";

const placesRoute = "/records/new/places" as Href;

export function PhotoSelectionPage() {
  const router = useRouter();
  const { addPhotosFromLibrary, photos, removePhoto } =
    useCreateRecordSession();
  const [isPicking, setIsPicking] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const openPhotoPicker = async () => {
    if (isPicking) {
      return;
    }

    const remainingSelectionCount = 8 - photos.length;
    if (remainingSelectionCount === 0) {
      Alert.alert("사진은 8장까지 선택할 수 있어요");
      return;
    }

    setIsPicking(true);

    try {
      const result = await launchImageLibraryAsync({
        allowsMultipleSelection: true,
        exif: true,
        mediaTypes: ["images"],
        orderedSelection: true,
        quality: 1,
        selectionLimit: remainingSelectionCount,
      });

      if (!result.canceled && result.assets.length > 0) {
        addPhotosFromLibrary(result.assets);
      }
    } catch {
      Alert.alert(
        "사진을 열 수 없어요",
        "사진 접근 권한을 확인한 뒤 다시 시도해 주세요.",
      );
    } finally {
      setIsPicking(false);
    }
  };

  const goToPlaces = async () => {
    if (photos.length === 0) {
      await openPhotoPicker();
      return;
    }

    setIsAnalyzing(true);
    await new Promise((resolve) => setTimeout(resolve, 650));
    router.push(placesRoute);
    setIsAnalyzing(false);
  };

  return (
    <Screen>
      <View style={styles.container}>
        <PageHeader onBackPress={() => router.back()} title="사진 선택" />

        <View
          style={[
            styles.selectionCard,
            photos.length === 0 && styles.emptySelectionCard,
          ]}
        >
          {photos.length > 0 ? (
            <PhotoStrip
              imageSize={60}
              onRemove={removePhoto}
              photos={photos}
              removable
              style={styles.photoStrip}
            />
          ) : null}

          <Pressable
            accessibilityLabel="사진 추가"
            accessibilityRole="button"
            disabled={isPicking}
            onPress={openPhotoPicker}
            style={({ pressed }) => [
              styles.addButton,
              photos.length === 0 && styles.emptyAddButton,
              shadows.floating,
              pressed && styles.pressed,
            ]}
          >
            <PlusIcon height={24} width={24} />
          </Pressable>
        </View>

        {photos.length === 0 ? (
          <View style={styles.guide}>
            <AppText tone="secondary" variant="subtitle03">
              알려드려요!
            </AppText>
            <View style={styles.guideItems}>
              <View>
                <AppText tone="secondary" variant="caption01">
                  • 사진의 위치 정보 기능을 켜주시면 좋아요.
                </AppText>
                <AppText
                  style={styles.guideDescription}
                  tone="placeholder"
                  variant="caption01"
                >
                  사진의 위치와 촬영 시간을 확인해 관광지 후보와 여행 날짜를 더
                  정확하게 제안해요.
                </AppText>
              </View>
              <View>
                <AppText tone="secondary" variant="caption01">
                  • 개인정보는 안전하게 보호돼요.
                </AppText>
                <AppText
                  style={styles.guideDescription}
                  tone="placeholder"
                  variant="caption01"
                >
                  사진 원본과 GPS는 Tripic 서버에 저장하지 않아요. 위치 검색 시
                  좌표만 관광공사 API로 전송될 수 있어요.
                </AppText>
              </View>
            </View>
          </View>
        ) : (
          <PrimaryButton
            label="다음"
            loading={isAnalyzing || isPicking}
            onPress={goToPlaces}
            style={styles.bottomButton}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  addButton: {
    alignItems: "center",
    backgroundColor: palette.gray[200],
    borderRadius: radii.pill,
    bottom: spacing.lg,
    height: 44,
    justifyContent: "center",
    left: "50%",
    marginLeft: -22,
    position: "absolute",
    width: 44,
  },
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
  emptyAddButton: {
    backgroundColor: semanticColors.feedback.information.level2,
    bottom: 34,
  },
  emptySelectionCard: {
    height: 112,
  },
  guide: {
    gap: spacing.md,
    marginTop: spacing.md,
    paddingLeft: spacing.xs,
  },
  guideDescription: {
    paddingLeft: 21,
  },
  guideItems: {
    gap: spacing.xs,
  },
  photoStrip: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  pressed: {
    opacity: 0.72,
  },
  selectionCard: {
    backgroundColor: semanticColors.background.surface,
    borderRadius: 40,
    height: 172,
    marginTop: spacing.lg,
    overflow: "hidden",
  },
});
