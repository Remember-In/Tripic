import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from "react-native";

import type { VisitedPlace } from "@/entities/travel-record";
import { RemoveIcon } from "@/shared/assets/photo-flow";
import {
  palette,
  radii,
  semanticColors,
  shadows,
  spacing,
} from "@/shared/config/theme";
import { AppText } from "@/shared/ui";

export type PlaceInfoSheetProps = {
  galleryImages?: readonly PlaceInformationImage[];
  imageInformationUnavailable?: boolean;
  informationUnavailable?: boolean;
  isRefreshing?: boolean;
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onRetry?: () => void;
  overview?: string;
  place: VisitedPlace;
  representativeImageUrl?: string;
  visible: boolean;
};

export type PlaceInformationImage = {
  originalUrl: string;
  thumbnailUrl?: string;
};

type SheetButtonProps = {
  destructive?: boolean;
  label: string;
  onPress: () => void;
};

function SheetButton({
  destructive = false,
  label,
  onPress,
}: SheetButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.sheetButton,
        destructive ? styles.destructiveButton : styles.neutralButton,
        pressed && styles.pressed,
      ]}
    >
      <AppText
        style={destructive && styles.destructiveText}
        tone={destructive ? "primary" : "placeholder"}
        variant="button03"
      >
        {label}
      </AppText>
    </Pressable>
  );
}

function plainTextOverview(value: string | undefined) {
  return value
    ?.replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type PlaceHeroImageProps = {
  fallbackSource: ImageSourcePropType;
  name: string;
  remoteUrl?: string;
};

function PlaceHeroImage({
  fallbackSource,
  name,
  remoteUrl,
}: PlaceHeroImageProps) {
  const [remoteImageUnavailable, setRemoteImageUnavailable] = useState(false);
  const [fallbackImageUnavailable, setFallbackImageUnavailable] =
    useState(false);

  useEffect(() => {
    setRemoteImageUnavailable(false);
    setFallbackImageUnavailable(false);
  }, [name, remoteUrl]);

  const showsRemoteImage = Boolean(remoteUrl && !remoteImageUnavailable);

  if (!showsRemoteImage && fallbackImageUnavailable) {
    return (
      <View style={[styles.heroImage, styles.heroImagePlaceholder]}>
        <AppText tone="placeholder" variant="caption01">
          표시할 사진이 없어요.
        </AppText>
      </View>
    );
  }

  return (
    <Image
      accessibilityLabel={`${name} ${showsRemoteImage ? "관광지 대표" : "사용자 기록"} 사진`}
      onError={
        showsRemoteImage
          ? () => setRemoteImageUnavailable(true)
          : () => setFallbackImageUnavailable(true)
      }
      resizeMode="cover"
      source={showsRemoteImage ? { uri: remoteUrl } : fallbackSource}
      style={styles.heroImage}
    />
  );
}

function GalleryImage({
  image,
  index,
}: {
  image: PlaceInformationImage;
  index: number;
}) {
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    setUnavailable(false);
  }, [image.originalUrl, image.thumbnailUrl]);

  if (unavailable) {
    return (
      <View style={[styles.galleryImage, styles.galleryImagePlaceholder]}>
        <AppText tone="placeholder" variant="caption02">
          이미지 없음
        </AppText>
      </View>
    );
  }

  return (
    <Image
      accessibilityLabel={`관광지 추가 이미지 ${index + 1}`}
      onError={() => setUnavailable(true)}
      resizeMode="cover"
      source={{ uri: image.thumbnailUrl ?? image.originalUrl }}
      style={styles.galleryImage}
    />
  );
}

export function PlaceInfoSheet({
  galleryImages = [],
  imageInformationUnavailable = false,
  informationUnavailable = false,
  isRefreshing = false,
  onClose,
  onDelete,
  onEdit,
  onRetry,
  overview,
  place,
  representativeImageUrl,
  visible,
}: PlaceInfoSheetProps) {
  const overviewText = plainTextOverview(overview);

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityLabel="장소 정보 닫기"
          onPress={onClose}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={[styles.sheet, shadows.sheet]}>
          <View style={styles.grabber} />
          <View style={styles.toolbar}>
            <Pressable
              accessibilityLabel="장소 정보 닫기"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.pressed,
              ]}
            >
              <RemoveIcon height={16} width={16} />
            </Pressable>
            <AppText style={styles.toolbarTitle} variant="subtitle03">
              장소 정보
            </AppText>
          </View>

          <ScrollView
            bounces={false}
            contentContainerStyle={styles.sheetContent}
            showsVerticalScrollIndicator={false}
          >
            <PlaceHeroImage
              fallbackSource={place.photo}
              name={place.name}
              remoteUrl={representativeImageUrl}
            />

            <View style={styles.placeHeading}>
              <AppText variant="heading03">{place.name}</AppText>
              <View style={styles.placeTags}>
                <View style={styles.placeTag}>
                  <AppText tone="tertiary" variant="caption02">
                    {place.region}
                  </AppText>
                </View>
                <View style={styles.placeTag}>
                  <AppText tone="tertiary" variant="caption02">
                    {place.category}
                  </AppText>
                </View>
                {place.stampApplied ? (
                  <View style={styles.stampTag}>
                    <AppText style={styles.stampText} variant="caption02">
                      스탬프 반영됨
                    </AppText>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.metadata}>
              {informationUnavailable ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={onRetry}
                  style={styles.informationState}
                >
                  <AppText tone="placeholder" variant="caption01">
                    관광지 상세 정보를 불러오지 못했어요.
                  </AppText>
                  <AppText style={styles.retryText} variant="button06">
                    다시 시도
                  </AppText>
                </Pressable>
              ) : isRefreshing ? (
                <View style={styles.informationState}>
                  <ActivityIndicator
                    color={semanticColors.brand.primary}
                    size="small"
                  />
                  <AppText tone="placeholder" variant="caption01">
                    관광지 정보를 확인하고 있어요.
                  </AppText>
                </View>
              ) : null}
              <View style={styles.metadataRow}>
                <AppText
                  style={styles.metadataLabel}
                  tone="placeholder"
                  variant="subtitle04"
                >
                  방문일
                </AppText>
                <AppText tone="secondary" variant="subtitle03">
                  {place.visitDate}
                </AppText>
              </View>
              <View style={styles.metadataRow}>
                <AppText
                  style={styles.metadataLabel}
                  tone="placeholder"
                  variant="subtitle04"
                >
                  주소
                </AppText>
                <AppText
                  style={styles.address}
                  tone="secondary"
                  variant="subtitle03"
                >
                  {place.address}
                </AppText>
              </View>
            </View>

            <View style={styles.informationSection}>
              <AppText tone="tertiary" variant="subtitle04">
                관광지 소개
              </AppText>
              {overviewText ? (
                <AppText tone="secondary" variant="body02">
                  {overviewText}
                </AppText>
              ) : !isRefreshing && !informationUnavailable ? (
                <AppText tone="placeholder" variant="caption01">
                  제공된 관광지 소개가 없어요.
                </AppText>
              ) : null}
            </View>

            <View style={styles.informationSection}>
              <AppText tone="tertiary" variant="subtitle04">
                관광지 이미지
              </AppText>
              {galleryImages.length > 0 ? (
                <ScrollView
                  contentContainerStyle={styles.gallery}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                >
                  {galleryImages.map((image, index) => (
                    <GalleryImage
                      image={image}
                      index={index}
                      key={`${image.originalUrl}:${index}`}
                    />
                  ))}
                </ScrollView>
              ) : imageInformationUnavailable ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={onRetry}
                  style={styles.inlineInformationState}
                >
                  <AppText tone="placeholder" variant="caption01">
                    관광지 이미지를 불러오지 못했어요.
                  </AppText>
                  <AppText style={styles.retryText} variant="button06">
                    다시 시도
                  </AppText>
                </Pressable>
              ) : !isRefreshing ? (
                <AppText tone="placeholder" variant="caption01">
                  제공된 관광지 이미지가 없어요.
                </AppText>
              ) : null}
            </View>

            <View style={styles.actions}>
              <SheetButton label="수정" onPress={onEdit} />
              <SheetButton destructive label="삭제" onPress={onDelete} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(17, 17, 17, 0.2)",
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  sheet: {
    backgroundColor: semanticColors.background.surface,
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    maxHeight: "92%",
    maxWidth: 420,
    overflow: "hidden",
    width: "100%",
  },
  grabber: {
    alignSelf: "center",
    backgroundColor: palette.gray[300],
    borderRadius: radii.pill,
    height: 5,
    marginTop: 5,
    width: 36,
  },
  toolbar: {
    alignItems: "center",
    height: 54,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: palette.gray[100],
    borderRadius: radii.pill,
    height: 44,
    justifyContent: "center",
    left: spacing.md,
    position: "absolute",
    width: 44,
  },
  toolbarTitle: {
    textAlign: "center",
  },
  sheetContent: {
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  heroImage: {
    aspectRatio: 1,
    borderRadius: radii.medium,
    width: "100%",
  },
  heroImagePlaceholder: {
    alignItems: "center",
    backgroundColor: palette.gray[50],
    justifyContent: "center",
  },
  placeHeading: {
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.lg,
  },
  placeTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  placeTag: {
    backgroundColor: palette.gray[100],
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  stampTag: {
    backgroundColor: palette.primary[50],
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  stampText: {
    color: palette.primary[900],
  },
  divider: {
    backgroundColor: semanticColors.border.disabled,
    height: StyleSheet.hairlineWidth,
    marginTop: spacing.md,
  },
  gallery: {
    gap: spacing.xs,
  },
  galleryImage: {
    borderRadius: radii.small,
    height: 112,
    width: 144,
  },
  galleryImagePlaceholder: {
    alignItems: "center",
    backgroundColor: palette.gray[50],
    justifyContent: "center",
  },
  metadata: {
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
  },
  informationSection: {
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.lg,
  },
  informationState: {
    alignItems: "center",
    backgroundColor: palette.gray[50],
    borderRadius: radii.small,
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 64,
    padding: spacing.sm,
  },
  inlineInformationState: {
    alignItems: "flex-start",
    backgroundColor: palette.gray[50],
    borderRadius: radii.small,
    gap: spacing.xs,
    padding: spacing.sm,
  },
  metadataRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  metadataLabel: {
    width: 40,
  },
  address: {
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  sheetButton: {
    alignItems: "center",
    backgroundColor: semanticColors.background.surface,
    borderRadius: radii.large,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 54,
  },
  neutralButton: {
    borderColor: semanticColors.border.disabled,
  },
  destructiveButton: {
    borderColor: semanticColors.feedback.error.level3,
  },
  destructiveText: {
    color: semanticColors.feedback.error.level1,
  },
  pressed: {
    opacity: 0.72,
  },
  retryText: {
    color: semanticColors.brand.primary,
  },
});
