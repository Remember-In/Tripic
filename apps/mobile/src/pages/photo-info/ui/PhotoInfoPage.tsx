import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import {
  placeFixtures,
  useCreateRecordSession,
} from "@/features/create-record-session";
import { SearchIcon } from "@/shared/assets/icons";
import {
  radii,
  semanticColors,
  spacing,
  typography,
} from "@/shared/config/theme";
import { AppText, PageHeader, PrimaryButton, Screen } from "@/shared/ui";

import { VisitDateSheet } from "./VisitDateSheet";

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function formatDisplayDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return `${monthNames[(month || 1) - 1]} ${day}, ${year}`;
}

export function PhotoInfoPage() {
  const router = useRouter();
  const { photoDate, photoPlace, selectedPhoto, setPhotoDate, setPhotoPlace } =
    useCreateRecordSession();
  const [dateSheetVisible, setDateSheetVisible] = useState(false);
  const [query, setQuery] = useState("");

  const displayedPlaces = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) {
      const selectedPlace = placeFixtures.find(
        (place) => place.name === photoPlace,
      );
      return selectedPlace ? [selectedPlace] : [placeFixtures[0]];
    }

    return placeFixtures
      .filter((place) =>
        `${place.name} ${place.address}`
          .toLocaleLowerCase()
          .includes(normalizedQuery),
      )
      .slice(0, 2);
  }, [photoPlace, query]);

  return (
    <Screen>
      <View style={styles.container}>
        <PageHeader onBackPress={() => router.back()} title="사진 정보 수정" />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.photoIntro}>
            {selectedPhoto ? (
              <Image source={selectedPhoto.source} style={styles.photo} />
            ) : (
              <View style={[styles.photo, styles.photoPlaceholder]} />
            )}
            <AppText variant="body01">
              이 사진과 관련된 정보를 골라주세요.
            </AppText>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <AppText
                style={styles.fieldLabel}
                tone="tertiary"
                variant="subtitle03"
              >
                방문 일자
              </AppText>
              <Pressable
                accessibilityLabel="방문 일자 변경"
                accessibilityRole="button"
                onPress={() => setDateSheetVisible(true)}
                style={({ pressed }) => [
                  styles.datePill,
                  pressed && styles.pressed,
                ]}
              >
                <AppText variant="button04">
                  {formatDisplayDate(photoDate)}
                </AppText>
              </Pressable>
            </View>

            <View style={styles.field}>
              <AppText
                style={styles.fieldLabel}
                tone="tertiary"
                variant="subtitle03"
              >
                장소
              </AppText>
              <View style={styles.searchField}>
                <SearchIcon height={24} width={24} />
                <TextInput
                  accessibilityLabel="장소 검색"
                  onChangeText={setQuery}
                  placeholder="장소를 검색해 주세요"
                  placeholderTextColor={semanticColors.text.disabled}
                  style={styles.searchInput}
                  value={query}
                />
              </View>

              <View style={styles.placeResults}>
                {displayedPlaces.map((place) => {
                  const isSelected = place.name === photoPlace;

                  return (
                    <Pressable
                      accessibilityLabel={`${place.name} 선택`}
                      accessibilityRole="button"
                      key={place.name}
                      onPress={() => setPhotoPlace(place.name)}
                      style={({ pressed }) => [
                        styles.placeCard,
                        isSelected && styles.selectedPlaceCard,
                        pressed && styles.pressed,
                      ]}
                    >
                      <AppText variant="subtitle02">{place.name}</AppText>
                      <AppText tone="secondary" variant="subtitle04">
                        {place.address}
                      </AppText>
                    </Pressable>
                  );
                })}
                {displayedPlaces.length === 0 ? (
                  <View style={styles.noResultCard}>
                    <AppText tone="tertiary" variant="body02">
                      일치하는 장소가 없어요.
                    </AppText>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </ScrollView>

        <PrimaryButton
          label="정보 수정 완료"
          onPress={() => router.back()}
          style={styles.bottomButton}
        />
      </View>

      <VisitDateSheet
        onClose={() => setDateSheetVisible(false)}
        onConfirm={(value) => {
          setPhotoDate(value);
          setDateSheetVisible(false);
        }}
        value={photoDate}
        visible={dateSheetVisible}
      />
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
  datePill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(118, 118, 128, 0.12)",
    borderRadius: radii.pill,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  field: {
    gap: spacing.xs,
  },
  fieldLabel: {
    paddingHorizontal: spacing.sm,
  },
  form: {
    gap: spacing.xxl,
    marginTop: spacing.lg,
  },
  noResultCard: {
    alignItems: "center",
    backgroundColor: semanticColors.background.surface,
    borderRadius: radii.medium,
    padding: spacing.md,
  },
  photo: {
    borderRadius: radii.medium,
    height: 80,
    width: 80,
  },
  photoIntro: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  photoPlaceholder: {
    backgroundColor: semanticColors.border.disabled,
  },
  placeCard: {
    backgroundColor: semanticColors.background.surface,
    borderColor: "transparent",
    borderRadius: radii.medium,
    borderWidth: 1.5,
    gap: spacing.xs,
    padding: spacing.md,
  },
  placeResults: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  pressed: {
    opacity: 0.72,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  searchField: {
    alignItems: "center",
    backgroundColor: semanticColors.background.surface,
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: spacing.xs,
    height: 48,
    paddingHorizontal: 11,
  },
  searchInput: {
    ...typography.body01,
    color: semanticColors.text.primary,
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
  },
  selectedPlaceCard: {
    borderColor: semanticColors.brand.primary,
  },
});
