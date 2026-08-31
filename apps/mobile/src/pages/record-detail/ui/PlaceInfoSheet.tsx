import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
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
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
  place: VisitedPlace;
  visible: boolean;
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

export function PlaceInfoSheet({
  onClose,
  onDelete,
  onEdit,
  place,
  visible,
}: PlaceInfoSheetProps) {
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
            <Image
              accessibilityLabel={`${place.name} 사진`}
              resizeMode="cover"
              source={place.photo}
              style={styles.heroImage}
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
  metadata: {
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
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
});
