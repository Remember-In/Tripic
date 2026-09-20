import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { DEFAULT_APP_CONFIG, useAppConfigQuery } from "@/entities/app-config";
import {
  browseTouristPlacesByArea,
  searchTouristPlaces,
  touristPlaceQueryKeys,
  type TouristPlaceCandidate,
} from "@/entities/tourist-place";
import {
  getRegionByAreaCode,
  isKtoAreaCode,
  type KtoAreaCode,
} from "@/entities/region";
import {
  useLocalRecordQuery,
  useUpdateLocalRecordMutation,
} from "@/features/local-records";
import { RegionSelector } from "@/features/tourist-place-search";
import { SearchIcon } from "@/shared/assets/icons";
import {
  palette,
  radii,
  semanticColors,
  spacing,
  typography,
} from "@/shared/config/theme";
import { AppText, PageHeader, PrimaryButton, Screen } from "@/shared/ui";

import {
  buildRecordPlaceUpdate,
  findRecordVisit,
  isValidDateOnly,
} from "../model/updateRecordPlace";

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function useDebouncedValue(value: string, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timeout);
  }, [delayMs, value]);

  return debouncedValue;
}

function validationMessage(date: string) {
  if (!date.trim()) {
    return "방문일을 입력해 주세요.";
  }
  if (!isValidDateOnly(date)) {
    return "YYYY-MM-DD 형식의 유효한 날짜를 입력해 주세요.";
  }
  return null;
}

export function RecordPlaceEditPage() {
  const router = useRouter();
  const appConfigQuery = useAppConfigQuery();
  const appConfig = appConfigQuery.data ?? DEFAULT_APP_CONFIG;
  const params = useLocalSearchParams<{
    recordId?: string | string[];
    visitId?: string | string[];
  }>();
  const recordId = singleParam(params.recordId);
  const visitId = singleParam(params.visitId);
  const recordQuery = useLocalRecordQuery(recordId);
  const updateRecord = useUpdateLocalRecordMutation();
  const initializedVisitRef = useRef<string | null>(null);
  const submittingRef = useRef(false);
  const [date, setDate] = useState("");
  const [query, setQuery] = useState("");
  const [selectedAreaCode, setSelectedAreaCode] = useState<
    KtoAreaCode | null | undefined
  >(undefined);
  const [selectedPlace, setSelectedPlace] =
    useState<TouristPlaceCandidate | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const keyword = query.trim();
  const debouncedQuery = useDebouncedValue(keyword, 350);
  const isKeywordMode = keyword.length > 0;
  const isKeywordReady = keyword.length >= 2 && keyword === debouncedQuery;
  const record = recordQuery.data ?? null;
  const context = useMemo(
    () => (record && visitId ? findRecordVisit(record, visitId) : null),
    [record, visitId],
  );
  const dateError = date ? validationMessage(date) : null;

  useEffect(() => {
    if (context && initializedVisitRef.current !== context.visit.id) {
      initializedVisitRef.current = context.visit.id;
      setDate(context.day.date);
      setQuery("");
      setSelectedAreaCode(
        isKtoAreaCode(context.visit.areaCode) ? context.visit.areaCode : null,
      );
      setSelectedPlace(null);
      setSubmitError(null);
    }
  }, [context]);

  const searchQuery = useQuery({
    enabled: !appConfigQuery.isPending && isKeywordMode && isKeywordReady,
    gcTime: 0,
    queryFn: ({ signal }) =>
      searchTouristPlaces(debouncedQuery, {
        maxCandidates: appConfig.kto.maxCandidates,
        signal,
      }),
    queryKey: touristPlaceQueryKeys.search(
      debouncedQuery,
      appConfig.kto.maxCandidates,
    ),
    retry: 1,
    staleTime: 0,
  });
  const areaQuery = useQuery({
    enabled:
      !appConfigQuery.isPending &&
      selectedAreaCode !== undefined &&
      !isKeywordMode,
    gcTime: 0,
    queryFn: ({ signal }) =>
      browseTouristPlacesByArea({
        areaCode: selectedAreaCode ?? undefined,
        maxCandidates: appConfig.kto.maxCandidates,
        signal,
      }),
    queryKey: touristPlaceQueryKeys.area(
      selectedAreaCode ?? undefined,
      appConfig.kto.maxCandidates,
    ),
    retry: 1,
    staleTime: 0,
  });
  const activeQuery = isKeywordMode ? searchQuery : areaQuery;
  const isSearchPreparing =
    appConfigQuery.isPending &&
    (isKeywordMode ? isKeywordReady : selectedAreaCode !== undefined);
  const candidates = activeQuery.data ?? [];
  const selectedRegion = getRegionByAreaCode(selectedAreaCode);
  const browseRegionLabel = selectedRegion?.shortName ?? "전체 지역";

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (recordId) {
      router.replace({
        params: { recordId },
        pathname: "/records/[recordId]",
      });
      return;
    }
    router.replace("/records");
  };

  const submit = async () => {
    const nextDateError = validationMessage(date);
    if (!record || !visitId || nextDateError) {
      setSubmitError(nextDateError);
      return;
    }
    if (submittingRef.current || updateRecord.isPending) {
      return;
    }

    submittingRef.current = true;
    setSubmitError(null);
    try {
      const input = buildRecordPlaceUpdate(
        record,
        visitId,
        date,
        selectedPlace,
      );
      await updateRecord.mutateAsync({ input, ownerKey: record.ownerKey });
      Alert.alert("수정 완료", "방문 장소 정보를 수정했어요.", [
        { onPress: goBack, text: "확인" },
      ]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.";
      setSubmitError(message);
      Alert.alert("장소를 수정하지 못했어요", message);
    } finally {
      submittingRef.current = false;
    }
  };

  if (!recordId || !visitId) {
    return (
      <PlaceEditState message="잘못된 장소 기록 주소예요." onBack={goBack} />
    );
  }
  if (recordQuery.isPending) {
    return (
      <PlaceEditState
        loading
        message="장소 기록을 불러오고 있어요."
        onBack={goBack}
      />
    );
  }
  if (recordQuery.isError) {
    return (
      <PlaceEditState
        message="장소 기록을 불러오지 못했어요."
        onBack={goBack}
        onRetry={() => void recordQuery.refetch()}
      />
    );
  }
  if (!record || !context) {
    return (
      <PlaceEditState
        message="삭제되었거나 없는 장소 기록이에요."
        onBack={goBack}
      />
    );
  }

  return (
    <Screen>
      <View style={styles.page}>
        <PageHeader onBackPress={goBack} title="장소 기록 수정" />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? spacing.lg : 0}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.scrollView}
          >
            <View style={styles.currentCard}>
              {context.photo?.localUri ? (
                <Image
                  accessibilityLabel="현재 장소 기록 사진"
                  resizeMode="cover"
                  source={{ uri: context.photo.localUri }}
                  style={styles.photo}
                />
              ) : (
                <View style={[styles.photo, styles.photoPlaceholder]}>
                  <AppText tone="placeholder" variant="caption02">
                    사진 없음
                  </AppText>
                </View>
              )}
              <View style={styles.currentCopy}>
                <AppText variant="subtitle03">현재 장소 기록</AppText>
                <MetadataRow label="방문일" value={context.day.date} />
                <MetadataRow
                  label="콘텐츠 ID"
                  value={context.visit.contentId}
                />
              </View>
            </View>

            <View style={styles.field}>
              <AppText
                style={styles.fieldLabel}
                tone="tertiary"
                variant="subtitle03"
              >
                방문일
              </AppText>
              <TextInput
                accessibilityLabel="변경할 방문일"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={10}
                onBlur={() => setSubmitError(validationMessage(date))}
                onChangeText={(value) => {
                  setDate(value);
                  setSubmitError(null);
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={semanticColors.text.disabled}
                style={[styles.input, dateError && styles.invalidInput]}
                value={date}
              />
              {dateError ? (
                <AppText style={styles.errorText} variant="caption02">
                  {dateError}
                </AppText>
              ) : null}
            </View>

            <View style={styles.field}>
              <AppText
                style={styles.fieldLabel}
                tone="tertiary"
                variant="subtitle03"
              >
                새 장소 (선택)
              </AppText>
              {selectedAreaCode !== undefined ? (
                <RegionSelector
                  onSelect={(areaCode) => {
                    setSelectedAreaCode(areaCode);
                    setQuery("");
                    setSelectedPlace(null);
                    setSubmitError(null);
                  }}
                  selectedAreaCode={selectedAreaCode}
                />
              ) : null}
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
                  accessibilityLabel="새 장소 검색"
                  autoCorrect={false}
                  onChangeText={(value) => {
                    setQuery(value);
                    if (value.trim()) {
                      setSelectedAreaCode(null);
                    }
                    setSelectedPlace(null);
                    setSubmitError(null);
                  }}
                  placeholder="장소명으로 전국 검색"
                  placeholderTextColor={semanticColors.text.disabled}
                  returnKeyType="search"
                  style={styles.searchInput}
                  value={query}
                />
              </View>

              <View style={styles.results}>
                {isKeywordMode && keyword.length < 2 ? (
                  <SearchState message="장소명을 두 글자 이상 입력해 주세요." />
                ) : isKeywordMode && !isKeywordReady ? (
                  <SearchState loading message="검색어를 확인하고 있어요." />
                ) : isSearchPreparing || activeQuery.isFetching ? (
                  <SearchState
                    loading
                    message={
                      isKeywordMode
                        ? "관광지를 검색하고 있어요."
                        : `${browseRegionLabel} 관광지를 불러오고 있어요.`
                    }
                  />
                ) : activeQuery.isError ? (
                  <SearchState
                    message={
                      activeQuery.error instanceof Error
                        ? activeQuery.error.message
                        : "관광지를 불러오지 못했어요."
                    }
                    onRetry={() => void activeQuery.refetch()}
                  />
                ) : candidates.length === 0 ? (
                  <SearchState
                    message={
                      isKeywordMode
                        ? "검색 결과가 없어요. 다른 장소명으로 검색해 보세요."
                        : `${browseRegionLabel}에서 표시할 관광지를 찾지 못했어요.`
                    }
                  />
                ) : (
                  candidates.map((place) => {
                    const selected =
                      place.contentId === selectedPlace?.contentId;
                    return (
                      <Pressable
                        accessibilityLabel={`${place.name} 선택`}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        key={place.contentId}
                        onPress={() => {
                          setSelectedPlace(place);
                          setSubmitError(null);
                        }}
                        style={({ pressed }) => [
                          styles.placeCard,
                          selected && styles.selectedPlaceCard,
                          pressed && styles.pressed,
                        ]}
                      >
                        <View style={styles.placeHeading}>
                          <AppText
                            style={styles.placeName}
                            variant="subtitle03"
                          >
                            {place.name}
                          </AppText>
                          {selected ? (
                            <View style={styles.selectedBadge}>
                              <AppText
                                style={styles.selectedBadgeText}
                                variant="caption02"
                              >
                                선택됨
                              </AppText>
                            </View>
                          ) : null}
                        </View>
                        <AppText tone="secondary" variant="body02">
                          {place.address || "주소 정보 없음"}
                        </AppText>
                        <AppText tone="tertiary" variant="caption02">
                          콘텐츠 ID {place.contentId}
                        </AppText>
                      </Pressable>
                    );
                  })
                )}
              </View>
            </View>

            {submitError ? (
              <View accessibilityRole="alert" style={styles.submitError}>
                <AppText style={styles.errorText} variant="body02">
                  {submitError}
                </AppText>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <PrimaryButton
              disabled={!isValidDateOnly(date)}
              label="장소 정보 수정"
              loading={updateRecord.isPending}
              onPress={() => void submit()}
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Screen>
  );
}

type MetadataRowProps = {
  label: string;
  value: string;
};

function MetadataRow({ label, value }: MetadataRowProps) {
  return (
    <View style={styles.metadataRow}>
      <AppText style={styles.metadataLabel} tone="tertiary" variant="caption02">
        {label}
      </AppText>
      <AppText selectable style={styles.metadataValue} variant="caption02">
        {value}
      </AppText>
    </View>
  );
}

type SearchStateProps = {
  loading?: boolean;
  message: string;
  onRetry?: () => void;
};

function SearchState({ loading, message, onRetry }: SearchStateProps) {
  const content = (
    <>
      {loading ? (
        <ActivityIndicator color={semanticColors.brand.primary} size="small" />
      ) : null}
      <AppText tone="tertiary" variant="body02">
        {message}
      </AppText>
      {onRetry ? (
        <AppText style={styles.retryText} variant="button06">
          다시 시도
        </AppText>
      ) : null}
    </>
  );

  return onRetry ? (
    <Pressable
      accessibilityRole="button"
      onPress={onRetry}
      style={({ pressed }) => [styles.searchState, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={styles.searchState}>{content}</View>
  );
}

type PlaceEditStateProps = {
  loading?: boolean;
  message: string;
  onBack: () => void;
  onRetry?: () => void;
};

function PlaceEditState({
  loading,
  message,
  onBack,
  onRetry,
}: PlaceEditStateProps) {
  return (
    <Screen>
      <View style={styles.page}>
        <PageHeader onBackPress={onBack} title="장소 기록 수정" />
        <View style={styles.pageState}>
          {loading ? (
            <ActivityIndicator
              color={semanticColors.brand.primary}
              size="small"
            />
          ) : null}
          <AppText tone="secondary" variant="body02">
            {message}
          </AppText>
          {onRetry ? (
            <Pressable accessibilityRole="button" onPress={onRetry}>
              <AppText style={styles.retryText} variant="button06">
                다시 시도
              </AppText>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  browseHint: {
    paddingHorizontal: spacing.sm,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
  },
  currentCard: {
    alignItems: "center",
    backgroundColor: semanticColors.background.surface,
    borderRadius: radii.large,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  currentCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  errorText: {
    color: semanticColors.feedback.error.level1,
  },
  field: {
    gap: spacing.xs,
  },
  fieldLabel: {
    paddingHorizontal: spacing.sm,
  },
  footer: {
    paddingTop: spacing.xxs,
  },
  input: {
    ...typography.body01,
    backgroundColor: semanticColors.background.surface,
    borderColor: "transparent",
    borderRadius: radii.medium,
    borderWidth: 1.5,
    color: semanticColors.text.primary,
    height: 52,
    paddingHorizontal: spacing.md,
  },
  invalidInput: {
    borderColor: semanticColors.feedback.error.level1,
  },
  keyboardView: {
    flex: 1,
  },
  metadataLabel: {
    width: 68,
  },
  metadataRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.xs,
  },
  metadataValue: {
    flex: 1,
  },
  page: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: 3,
  },
  pageState: {
    alignItems: "center",
    flex: 1,
    gap: spacing.sm,
    justifyContent: "center",
  },
  photo: {
    alignItems: "center",
    borderRadius: radii.medium,
    flexShrink: 0,
    height: 96,
    justifyContent: "center",
    width: 96,
  },
  photoPlaceholder: {
    backgroundColor: palette.gray[100],
  },
  placeCard: {
    backgroundColor: semanticColors.background.surface,
    borderColor: "transparent",
    borderRadius: radii.medium,
    borderWidth: 1.5,
    gap: spacing.xs,
    padding: spacing.md,
  },
  placeHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  placeName: {
    flex: 1,
  },
  pressed: {
    opacity: 0.72,
  },
  results: {
    gap: spacing.xs,
  },
  retryText: {
    color: semanticColors.brand.primary,
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
  scrollView: {
    flex: 1,
  },
  searchState: {
    alignItems: "center",
    backgroundColor: semanticColors.background.surface,
    borderRadius: radii.medium,
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 80,
    padding: spacing.md,
  },
  selectedBadge: {
    backgroundColor: palette.primary[50],
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  selectedBadgeText: {
    color: palette.primary[900],
  },
  selectedPlaceCard: {
    borderColor: semanticColors.brand.primary,
  },
  submitError: {
    backgroundColor: palette.secondary[50],
    borderRadius: radii.medium,
    padding: spacing.md,
  },
});
