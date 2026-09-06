import { Image, Pressable, StyleSheet, View } from "react-native";

import type { ItineraryDay } from "@/entities/travel-record";
import { palette, radii, semanticColors, spacing } from "@/shared/config/theme";
import { AppText } from "@/shared/ui";

export type TripItineraryProps = {
  days: readonly ItineraryDay[];
  onPhotoPress: (day: ItineraryDay, photoIndex: number) => void;
};

export function TripItinerary({ days, onPhotoPress }: TripItineraryProps) {
  return (
    <View style={styles.itinerary}>
      {days.map((day) => (
        <View key={day.id} style={styles.dayCard}>
          <View style={styles.dayTitleRow}>
            <AppText variant="subtitle02">{day.day}일차</AppText>
            <AppText tone="placeholder" variant="subtitle04">
              {day.date}
            </AppText>
          </View>

          <View style={styles.photos}>
            {day.photos.map((photo, photoIndex) => (
              <Pressable
                accessibilityLabel={`${day.day}일차 ${photoIndex + 1}번째 사진 장소 정보`}
                accessibilityRole="button"
                key={`${day.id}-${photoIndex}`}
                onPress={() => onPhotoPress(day, photoIndex)}
                style={({ pressed }) => [
                  styles.photoButton,
                  pressed && styles.pressed,
                ]}
              >
                <Image resizeMode="cover" source={photo} style={styles.photo} />
              </Pressable>
            ))}
          </View>

          <View style={styles.notePlaceholder}>
            {day.note ? (
              <AppText tone="secondary" variant="caption01">
                {day.note}
              </AppText>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  itinerary: {
    gap: spacing.lg,
  },
  dayCard: {
    backgroundColor: semanticColors.background.surface,
    borderRadius: radii.large,
    padding: spacing.md,
  },
  dayTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  photos: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  photoButton: {
    borderRadius: radii.medium,
    height: 72,
    overflow: "hidden",
    width: 72,
  },
  photo: {
    height: "100%",
    width: "100%",
  },
  notePlaceholder: {
    backgroundColor: palette.gray[50],
    borderRadius: radii.small,
    marginTop: spacing.lg,
    minHeight: 43,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pressed: {
    opacity: 0.78,
  },
});
