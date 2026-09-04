import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { getRegionByAreaCode, type KtoAreaCode } from "@/entities/region";
import {
  browseTouristPlacesByArea,
  findNearbyTouristPlaces,
  searchTouristPlaces,
  touristPlaceQueryKeys,
  type TouristPlaceCandidate,
} from "@/entities/tourist-place";
import { useCreateRecordSession } from "@/features/create-record-session";
import { RegionSelector } from "@/features/tourist-place-search";
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

function useDebouncedValue(value: string, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timeout);
  }, [delayMs, value]);

  return debouncedValue;
}

function candidateDescription(place: TouristPlaceCandidate) {
  if (place.matchMethod !== "GPS_CANDIDATE") {
    return place.address || "주소 정보 없음";
  }

  const distance =
    place.distanceMeters === undefined
      ? "거리 정보 없음"
      : place.distanceMeters < 1_000
        ? `${Math.round(place.distanceMeters)}m`
        : `${(place.distanceMeters / 1_000).toFixed(1)}km`;
  return [place.address, distance].filter(Boolean).join(" · ");
}

function candidateRegionName(place: TouristPlaceCandidate) {
  return (
    getRegionByAreaCode(place.areaCode)?.name ?? `지역코드 ${place.areaCode}`
  );
}

function candidateTypeCode(place: TouristPlaceCandidate) {
  return place.categoryCode ?? place.contentTypeId ?? "유형 정보 없음";
}

function CandidateImage({ place }: { place: TouristPlaceCandidate }) {
  const [imageUnavailable, setImageUnavailable] = useState(false);

  useEffect(() => {
    setImageUnavailable(false);
  }, [place.imageUrl]);

  if (!place.imageUrl || imageUnavailable) {
    return (
      <View style={[styles.candidateImage, styles.candidateImagePlaceholder]}>
        <AppText
          style={styles.candidateImagePlaceholderText}
          tone="placeholder"
          variant="caption02"
        >
          대표 이미지 없음
        </AppText>
      </View>
    );
  }

  return (
    <Image
      accessibilityLabel={`${place.name} 대표 이미지`}
      onError={() => setImageUnavailable(true)}
      resizeMode="cover"
      source={{ uri: place.imageUrl }}
      style={styles.candidateImage}
    />
  );
}

type NearbyPlacesState = {
  error: Error | null;
  isFetching: boolean;
  photoId: string;
  places: readonly TouristPlaceCandidate[];
};

function emptyNearbyPlacesState(photoId: string): NearbyPlacesState {
  return { error: null, isFetching: false, photoId, places: [] };
}

export function PhotoInfoPage() {
  const router = useRouter();
  const {
    discardTransientGps,
    locationSearchDecision,
    photoDate,
    photoPlace,
    selectedPhoto,
    setPhotoDate,
    setPhotoPlace,
  } = useCreateRecordSession();
  const [dateSheetVisible, setDateSheetVisible] = useState(false);
  const [query, setQuery] = useState("");
  const keyword = query.trim();
  const debouncedQuery = useDebouncedValue(keyword, 350);
  const [selectedAreaCode, setSelectedAreaCode] = useState<
    KtoAreaCode | null | undefined
  >(undefined);
  const isKeywordMode = keyword.length > 0;
  const isKeywordReady = keyword.length >= 2 && keyword === debouncedQuery;
  const photoId = selectedPhoto?.id ?? "missing";
  const coordinates = selectedPhoto?.gps;
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlacesState>(() =>
    emptyNearbyPlacesState(photoId),
  );

  useEffect(() => {
    const latitude = coordinates?.latitude;
    const longitude = coordinates?.longitude;

    if (
      locationSearchDecision !== "nearby" ||
      isKeywordMode ||
      selectedAreaCode !== undefined ||
      latitude === undefined ||
      longitude === undefined
    ) {
      setNearbyPlaces((current) => {
        if (current.photoId !== photoId) {
          return emptyNearbyPlacesState(photoId);
        }
        return current.isFetching ? { ...current, isFetching: false } : current;
      });
      return;
    }

    const controller = new AbortController();
    let active = true;
    setNearbyPlaces({
      error: null,
      isFetching: true,
      photoId,
      places: [],
    });

    void findNearbyTouristPlaces({ latitude, longitude }, controller.signal)
      .then((places) => {
        if (active) {
          setNearbyPlaces({
            error: null,
            isFetching: false,
            photoId,
            places,
          });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setNearbyPlaces({
            error:
              error instanceof Error
                ? error
                : new Error("주변 관광지를 불러오지 못했어요."),
            isFetching: false,
            photoId,
            places: [],
          });
        }
      })
      .finally(() => {
        discardTransientGps(photoId);
      });

    return () => {
      active = false;
      controller.abort();
      discardTransientGps(photoId);
    };
  }, [
    coordinates?.latitude,
    coordinates?.longitude,
    discardTransientGps,
    isKeywordMode,
    locationSearchDecision,
    photoId,
    selectedAreaCode,
  ]);

  const searchQuery = useQuery({
    enabled: isKeywordMode && isKeywordReady,
    gcTime: 0,
    queryFn: ({ signal }) => searchTouristPlaces(debouncedQuery, signal),
    queryKey: touristPlaceQueryKeys.search(debouncedQuery),
    retry: 1,
    staleTime: 0,
  });

  const areaQuery = useQuery({
    enabled: selectedAreaCode !== undefined && !isKeywordMode,
    gcTime: 0,
    queryFn: ({ signal }) =>
      browseTouristPlacesByArea(selectedAreaCode ?? undefined, signal),
    queryKey: touristPlaceQueryKeys.area(selectedAreaCode ?? undefined),
    retry: 1,
    staleTime: 0,
  });

  const displayedPlaces = useMemo(() => {
    const candidates = isKeywordMode
      ? isKeywordReady
        ? (searchQuery.data ?? [])
        : []
      : selectedAreaCode !== undefined
        ? (areaQuery.data ?? [])
        : nearbyPlaces.places;

    if (
      photoPlace &&
      !candidates.some(
        (candidate) => candidate.contentId === photoPlace.contentId,
      )
    ) {
      return [photoPlace, ...candidates];
    }

    return candidates;
  }, [
    areaQuery.data,
    isKeywordMode,
    isKeywordReady,
    nearbyPlaces.places,
    photoPlace,
    searchQuery.data,
    selectedAreaCode,
  ]);

  const isRegionBrowse = !isKeywordMode && selectedAreaCode !== undefined;
  const isFetching = isKeywordMode
    ? keyword.length >= 2 && (!isKeywordReady || searchQuery.isFetching)
    : isRegionBrowse
      ? areaQuery.isFetching
      : nearbyPlaces.isFetching;
  const activeError = isKeywordMode
    ? isKeywordReady
      ? searchQuery.error
      : null
    : isRegionBrowse
      ? areaQuery.error
      : nearbyPlaces.error;
  const canRetry = isKeywordMode || isRegionBrowse;
  const selectedRegionName =
    getRegionByAreaCode(selectedAreaCode)?.shortName ?? "전체 지역";

  const completeEditing = () => {
    if (!photoPlace) {
      Alert.alert("장소를 선택해 주세요");
      return;
    }

    router.back();
  };

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
              <RegionSelector
                onSelect={(areaCode) => {
                  setSelectedAreaCode(areaCode);
                  setQuery("");
                  discardTransientGps(selectedPhoto?.id);
                }}
                selectedAreaCode={selectedAreaCode}
              />
              <AppText
                style={styles.browseHint}
                tone="tertiary"
                variant="caption02"
              >
                지역을 고르면 관광지를 둘러보고, 장소명을 입력하면 전국에서
                검색해요.
              </AppText>
              <View style={styles.searchField}>
                <SearchIcon height={24} width={24} />
                <TextInput
                  accessibilityLabel="장소 검색"
                  onChangeText={(value) => {
                    setQuery(value);
                    if (value.trim()) {
                      setSelectedAreaCode(undefined);
                    }
                  }}
                  placeholder="장소명으로 전국 검색"
                  placeholderTextColor={semanticColors.text.disabled}
                  style={styles.searchInput}
                  value={query}
                />
              </View>

              <View style={styles.placeResults}>
                {isFetching ? (
                  <View style={styles.statusCard}>
                    <ActivityIndicator
                      color={semanticColors.brand.primary}
                      size="small"
                    />
                    <AppText tone="tertiary" variant="body02">
                      관광지 후보를 찾고 있어요.
                    </AppText>
                  </View>
                ) : null}

                {activeError ? (
                  <Pressable
                    accessibilityRole={canRetry ? "button" : undefined}
                    disabled={!canRetry}
                    onPress={() =>
                      void (isRegionBrowse
                        ? areaQuery.refetch()
                        : searchQuery.refetch())
                    }
                    style={({ pressed }) => [
                      styles.statusCard,
                      pressed && canRetry && styles.pressed,
                    ]}
                  >
                    <AppText tone="secondary" variant="body02">
                      {activeError.message}
                    </AppText>
                    {canRetry ? (
                      <AppText style={styles.retryText} variant="button06">
                        다시 시도
                      </AppText>
                    ) : (
                      <AppText tone="tertiary" variant="caption01">
                        좌표는 폐기했어요. 장소명을 직접 검색해 주세요.
                      </AppText>
                    )}
                  </Pressable>
                ) : null}

                {displayedPlaces.map((place) => {
                  const isSelected = place.contentId === photoPlace?.contentId;

                  return (
                    <Pressable
                      accessibilityLabel={`${place.name}, ${candidateRegionName(place)}, 관광 유형 ${candidateTypeCode(place)} 선택`}
                      accessibilityRole="button"
                      key={`${place.matchMethod}:${place.contentId}`}
                      onPress={() => {
                        setPhotoPlace(place);
                        discardTransientGps(selectedPhoto?.id);
                      }}
                      style={({ pressed }) => [
                        styles.placeCard,
                        isSelected && styles.selectedPlaceCard,
                        pressed && styles.pressed,
                      ]}
                    >
                      <CandidateImage place={place} />
                      <View style={styles.placeCardBody}>
                        <AppText variant="subtitle02">{place.name}</AppText>
                        <AppText tone="secondary" variant="subtitle04">
                          {candidateDescription(place)}
                        </AppText>
                        <View style={styles.placeMetadata}>
                          <View style={styles.placeMetadataTag}>
                            <AppText tone="tertiary" variant="caption02">
                              {candidateRegionName(place)}
                            </AppText>
                          </View>
                          <View style={styles.placeMetadataTag}>
                            <AppText tone="tertiary" variant="caption02">
                              관광 유형 {candidateTypeCode(place)}
                            </AppText>
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
                {!isFetching && !activeError && displayedPlaces.length === 0 ? (
                  <View style={styles.noResultCard}>
                    <AppText tone="tertiary" variant="body02">
                      {query.trim().length === 1
                        ? "검색어를 두 글자 이상 입력해 주세요."
                        : isRegionBrowse
                          ? `${selectedRegionName}에서 표시할 관광지를 찾지 못했어요.`
                          : locationSearchDecision === "nearby" && !query.trim()
                            ? "주변 후보가 없어요. 장소명을 직접 검색해 주세요."
                            : "지역을 고르거나 장소명을 두 글자 이상 검색해 주세요."}
                    </AppText>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </ScrollView>

        <PrimaryButton
          label="정보 수정 완료"
          onPress={completeEditing}
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
  browseHint: {
    paddingHorizontal: spacing.sm,
  },
  candidateImage: {
    borderRadius: radii.small,
    height: 88,
    width: 88,
  },
  candidateImagePlaceholder: {
    alignItems: "center",
    backgroundColor: semanticColors.background.canvas,
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },
  candidateImagePlaceholderText: {
    textAlign: "center",
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
    alignItems: "center",
    backgroundColor: semanticColors.background.surface,
    borderColor: "transparent",
    borderRadius: radii.medium,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.sm,
  },
  placeCardBody: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  placeMetadata: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xxs,
  },
  placeMetadataTag: {
    backgroundColor: semanticColors.background.canvas,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
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
  statusCard: {
    alignItems: "center",
    backgroundColor: semanticColors.background.surface,
    borderRadius: radii.medium,
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 72,
    padding: spacing.md,
  },
  retryText: {
    color: semanticColors.brand.primary,
  },
});
