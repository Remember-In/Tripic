import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";

import type { DraftPhoto } from "@/features/create-record-session/model/types";
import { RemoveBackgroundIcon, RemoveIcon } from "@/shared/assets/photo-flow";
import { radii, spacing } from "@/shared/config/theme";

type PhotoStripProps = {
  imageSize?: number;
  onPhotoPress?: (photo: DraftPhoto, index: number) => void;
  onRemove?: (photoId: string) => void;
  photos: DraftPhoto[];
  removable?: boolean;
  style?: ViewStyle;
};

export function PhotoStrip({
  imageSize = 72,
  onPhotoPress,
  onRemove,
  photos,
  removable = false,
  style,
}: PhotoStripProps) {
  const itemSize = removable ? 72 : imageSize;

  return (
    <ScrollView
      contentContainerStyle={[styles.content, style]}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      {photos.map((photo, index) => (
        <View
          key={photo.id}
          style={[styles.item, { height: itemSize, width: itemSize }]}
        >
          <Image
            source={photo.source}
            style={[
              styles.image,
              {
                height: imageSize,
                marginTop: removable ? itemSize - imageSize : 0,
                width: imageSize,
              },
            ]}
          />
          {onPhotoPress ? (
            <Pressable
              accessibilityLabel={`${index + 1}번째 사진 정보 수정`}
              accessibilityRole="button"
              onPress={() => onPhotoPress(photo, index)}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          {removable && onRemove ? (
            <Pressable
              accessibilityLabel="사진 선택 해제"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => onRemove(photo.id)}
              style={styles.removeButton}
            >
              <RemoveBackgroundIcon height={24} width={24} />
              <RemoveIcon height={16} style={styles.removeIcon} width={16} />
            </Pressable>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.sm,
  },
  image: {
    borderRadius: radii.medium,
  },
  item: {
    overflow: "visible",
    position: "relative",
  },
  removeButton: {
    alignItems: "center",
    height: 24,
    justifyContent: "center",
    position: "absolute",
    right: 0,
    top: 0,
    width: 24,
    zIndex: 1,
  },
  removeIcon: {
    position: "absolute",
  },
});
