import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { getRegionByAreaCode } from "@/entities/region";
import {
  fetchKtoPlaceDetail,
  touristPlaceQueryKeys,
} from "@/entities/tourist-place";
import type { UpdateLocalTravelRecordInput } from "@/entities/travel-record";
import {
  mapLocalRecordToDisplay,
  useDeleteLocalRecordMutation,
  useLocalRecordQuery,
  useUpdateLocalRecordMutation,
} from "@/features/local-records";
import { EditIcon } from "@/shared/assets/icons";
import { palette, radii, semanticColors, spacing } from "@/shared/config/theme";
import { AppText, PageHeader, Screen } from "@/shared/ui";
import { TripItinerary } from "@/widgets/trip-itinerary";

import { removeRecordPhoto } from "../model/removeRecordPhoto";
import { PlaceInfoSheet } from "./PlaceInfoSheet";

type SelectedPhoto = {
  dayId: string;
  photoIndex: number;
};

export function RecordDetailPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ recordId?: string | string[] }>();
  const recordId = Array.isArray(params.recordId)
    ? params.recordId[0]
    : params.recordId;
  const recordQuery = useLocalRecordQuery(recordId);
  const updateRecord = useUpdateLocalRecordMutation();
  const deleteRecord = useDeleteLocalRecordMutation();
  const [selectedPhoto, setSelectedPhoto] = useState<SelectedPhoto | null>(
    null,
  );

  const localRecord = recordQuery.data ?? null;
  const selectedDay = selectedPhoto
    ? localRecord?.days.find((day) => day.id === selectedPhoto.dayId)
    : undefined;
  const localPhoto = selectedDay?.photos[selectedPhoto?.photoIndex ?? 0];
  const selectedVisit = selectedDay?.visits.find(
    (visit) => visit.photoId === localPhoto?.id,
  );
  const contentId = selectedVisit?.contentId;
  const placeQuery = useQuery({
    enabled: Boolean(contentId),
    gcTime: 0,
    queryFn: ({ signal }) =>
      contentId ? fetchKtoPlaceDetail(contentId, { signal }) : null,
    queryKey: contentId
      ? touristPlaceQueryKeys.detail(contentId)
      : (["tourist-place", "detail", "pending"] as const),
    retry: 1,
    staleTime: 0,
  });
  const record = useMemo(
    () =>
      localRecord
        ? mapLocalRecordToDisplay(localRecord, {
            address: placeQuery.data?.address,
            category: placeQuery.data?.categoryCode,
            name: placeQuery.data?.title,
          })
        : null,
    [localRecord, placeQuery.data],
  );

  const selectedPlace = useMemo(() => {
    if (!record || !localPhoto || !selectedVisit) {
      return null;
    }
    const region = getRegionByAreaCode(selectedVisit.areaCode);
    return {
      address: placeQuery.data?.address || region?.name || "주소 정보 없음",
      category:
        placeQuery.data?.categoryCode || selectedVisit.categoryCode || "관광지",
      id: selectedVisit.contentId,
      name: placeQuery.data?.title || `관광지 ${selectedVisit.contentId}`,
      photo: { uri: localPhoto.localUri ?? "" },
      region: region?.name ?? "지역",
      stampApplied: true,
      visitDate: selectedVisit.visitedAt.slice(0, 10).replaceAll("-", "."),
    };
  }, [localPhoto, placeQuery.data, record, selectedVisit]);

  const retryPlaceInformation = () => {
    void placeQuery.refetch();
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/records");
  };

  const openEdit = () => {
    setSelectedPhoto(null);
    if (recordId) {
      router.push({
        params: { recordId },
        pathname: "/records/[recordId]/edit",
      });
    }
  };

  const openPlaceEdit = () => {
    if (!recordId || !selectedVisit) {
      return;
    }
    const visitId = selectedVisit.id;
    setSelectedPhoto(null);
    router.push({
      params: { recordId, visitId },
      pathname: "/records/[recordId]/places/[visitId]/edit",
    });
  };

  const deleteSelectedPhoto = async () => {
    if (!localRecord || !selectedDay || !localPhoto) {
      return;
    }

    const remainingDays = removeRecordPhoto(
      localRecord,
      selectedDay.id,
      localPhoto.id,
    );

    try {
      if (remainingDays.length === 0) {
        const result = await deleteRecord.mutateAsync({
          ownerKey: localRecord.ownerKey,
          recordId: localRecord.id,
        });
        setSelectedPhoto(null);
        router.replace("/records");
        if (
          result.photoCleanup.deferred ||
          result.photoCleanup.failedCount > 0
        ) {
          Alert.alert(
            "기록을 삭제했어요",
            "사진 사본은 다음 실행 때 다시 정리할게요.",
          );
        }
        return;
      }

      const input: UpdateLocalTravelRecordInput = {
        days: remainingDays,
        id: localRecord.id,
        style: localRecord.style,
        tags: localRecord.tags,
        theme: localRecord.theme,
        title: localRecord.title,
      };
      const result = await updateRecord.mutateAsync({
        input,
        ownerKey: localRecord.ownerKey,
      });
      setSelectedPhoto(null);
      if (result.photoCleanup.deferred || result.photoCleanup.failedCount > 0) {
        Alert.alert(
          "장소 기록을 삭제했어요",
          "사진 사본은 다음 실행 때 다시 정리할게요.",
        );
      }
    } catch {
      Alert.alert("장소를 삭제하지 못했어요", "잠시 후 다시 시도해 주세요.");
    }
  };

  const confirmPlaceDelete = () => {
    Alert.alert(
      "장소 기록을 삭제할까요?",
      "삭제하면 여행 일정에서 이 장소와 사진이 사라지며 복구할 수 없어요.",
      [
        { style: "cancel", text: "취소" },
        {
          onPress: () => void deleteSelectedPhoto(),
          style: "destructive",
          text: "삭제",
        },
      ],
    );
  };

  if (!recordId) {
    return <RecordState message="잘못된 기록 주소예요." onBack={goBack} />;
  }

  if (recordQuery.isPending) {
    return (
      <RecordState loading message="기록을 불러오고 있어요." onBack={goBack} />
    );
  }

  if (recordQuery.isError) {
    return (
      <RecordState
        message="기록을 불러오지 못했어요."
        onBack={goBack}
        onRetry={() => void recordQuery.refetch()}
      />
    );
  }

  if (!record || !localRecord) {
    return (
      <RecordState message="삭제되었거나 없는 기록이에요." onBack={goBack} />
    );
  }

  return (
    <Screen>
      <View style={styles.page}>
        <PageHeader
          actionAccessibilityLabel="기록 수정"
          actionIcon={EditIcon}
          onActionPress={openEdit}
          onBackPress={goBack}
          style={styles.header}
          title="기록"
        />

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.titleCard}>
            <AppText variant="subtitle03">{record.title}</AppText>
          </View>

          <TripItinerary
            days={record.days}
            onPhotoPress={(day, photoIndex) =>
              setSelectedPhoto({ dayId: day.id, photoIndex })
            }
          />

          <View style={styles.tagsSection}>
            <AppText
              style={styles.sectionTitle}
              tone="tertiary"
              variant="subtitle03"
            >
              해시태그
            </AppText>
            <View style={styles.tagsCard}>
              {record.tags.length > 0 ? (
                record.tags.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <AppText tone="secondary" variant="caption02">
                      {tag}
                    </AppText>
                  </View>
                ))
              ) : (
                <AppText tone="placeholder" variant="caption02">
                  등록한 해시태그가 없어요.
                </AppText>
              )}
            </View>
          </View>
        </ScrollView>
      </View>

      {selectedPlace ? (
        <PlaceInfoSheet
          informationUnavailable={
            placeQuery.isError ||
            (placeQuery.isSuccess && placeQuery.data === null)
          }
          isRefreshing={placeQuery.isFetching}
          onClose={() => setSelectedPhoto(null)}
          onDelete={confirmPlaceDelete}
          onEdit={openPlaceEdit}
          onRetry={retryPlaceInformation}
          overview={placeQuery.data?.overview}
          place={selectedPlace}
          visible={Boolean(selectedPhoto)}
        />
      ) : null}
    </Screen>
  );
}

type RecordStateProps = {
  loading?: boolean;
  message: string;
  onBack: () => void;
  onRetry?: () => void;
};

function RecordState({ loading, message, onBack, onRetry }: RecordStateProps) {
  return (
    <Screen>
      <View style={styles.page}>
        <PageHeader onBackPress={onBack} title="기록" />
        <View style={styles.state}>
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
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
  },
  page: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: 3,
  },
  retryText: {
    color: semanticColors.brand.primary,
  },
  sectionTitle: {
    paddingLeft: spacing.sm,
  },
  state: {
    alignItems: "center",
    flex: 1,
    gap: spacing.sm,
    justifyContent: "center",
  },
  tag: {
    backgroundColor: palette.gray[50],
    borderRadius: radii.small,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  tagsCard: {
    backgroundColor: semanticColors.background.surface,
    borderRadius: radii.large,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 18,
  },
  tagsSection: {
    gap: spacing.xs,
  },
  titleCard: {
    backgroundColor: semanticColors.background.surface,
    borderRadius: radii.large,
    padding: spacing.md,
  },
});
