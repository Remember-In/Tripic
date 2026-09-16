import { useRouter, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import {
  TOTAL_KTO_REGION_COUNT,
  collectVisitedAreaCodes,
  collectVisitedSigunguKeys,
} from "@/entities/region";
import { useCreateRecordSession } from "@/features/create-record-session";
import {
  mapLocalRecordSummaryToDisplay,
  useLocalRecordStatsQuery,
  useLocalRecordOwnerKey,
  useLocalRecordsQuery,
  useLocalRegionProgressQuery,
} from "@/features/local-records";
import RecordIcon from "@/shared/assets/home/record.svg";
import { ChevronRightIcon, SettingsIcon } from "@/shared/assets/icons";
import { radii, semanticColors, spacing } from "@/shared/config/theme";
import {
  AppText,
  FloatingIconButton,
  PrimaryButton,
  Screen,
} from "@/shared/ui";
import {
  INITIAL_TRAVEL_MAP_HISTORY,
  TravelMap,
  currentMapDepth,
  goBackMapHistory,
  navigateMapHistory,
  type TravelMapDepth,
  type TravelMapHistory,
} from "@/widgets/travel-map";

type StatCardProps = {
  highlighted?: boolean;
  label: string;
  suffix: string;
  value: number;
};

function StatCard({
  highlighted = false,
  label,
  suffix,
  value,
}: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statValueRow}>
        <AppText
          style={highlighted ? styles.highlightedStatValue : undefined}
          variant="heading01"
        >
          {value}
        </AppText>
        <AppText tone="disabled" variant="subtitle02">
          {suffix}
        </AppText>
      </View>
      <AppText tone="placeholder" variant="subtitle03">
        {label}
      </AppText>
    </View>
  );
}

export function HomePage() {
  const router = useRouter();
  const { resetDraft } = useCreateRecordSession();
  const areaProgress = useLocalRegionProgressQuery("area");
  const sigunguProgress = useLocalRegionProgressQuery("sigungu");
  const recordsQuery = useLocalRecordsQuery();
  const stats = useLocalRecordStatsQuery();
  const ownerKey = useLocalRecordOwnerKey();
  const [mapHistory, setMapHistory] = useState<TravelMapHistory>(
    INITIAL_TRAVEL_MAP_HISTORY,
  );
  const recentRecords = useMemo(
    () =>
      (recordsQuery.data ?? []).slice(0, 3).map(mapLocalRecordSummaryToDisplay),
    [recordsQuery.data],
  );
  const visitedAreaCodes = useMemo(
    () =>
      collectVisitedAreaCodes(
        (areaProgress.data ?? []).map((progress) => progress.areaCode),
      ),
    [areaProgress.data],
  );
  const visitedSigunguKeys = useMemo(
    () => collectVisitedSigunguKeys(sigunguProgress.data ?? []),
    [sigunguProgress.data],
  );
  const mapDepth = currentMapDepth(mapHistory);

  const navigateMap = useCallback((nextDepth: TravelMapDepth) => {
    setMapHistory((history) => navigateMapHistory(history, nextDepth));
  }, []);

  const goBackMap = useCallback(() => {
    setMapHistory((history) => goBackMapHistory(history));
  }, []);

  const openRecords = useCallback(() => {
    router.push("/records" as Href);
  }, [router]);

  const openSettings = useCallback(() => {
    router.push("/settings" as Href);
  }, [router]);

  const openRecord = useCallback(
    (recordId: string) => {
      router.push({
        params: { recordId },
        pathname: "/records/[recordId]",
      });
    },
    [router],
  );

  const startPhotoRecord = useCallback(() => {
    if (!ownerKey) {
      Alert.alert(
        "기록을 열 수 없어요",
        "기록 저장공간을 준비한 뒤 다시 시도해 주세요.",
      );
      return;
    }
    resetDraft();
    router.push("/records/new/photos" as Href);
  }, [ownerKey, resetDraft, router]);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <AppText style={styles.headerTitle} variant="heading01">
            여행 지도
          </AppText>
          <View style={styles.headerActions}>
            <FloatingIconButton
              accessibilityLabel="여행 기록 보기"
              icon={RecordIcon}
              onPress={openRecords}
            />
            <FloatingIconButton
              accessibilityLabel="설정 열기"
              icon={SettingsIcon}
              onPress={openSettings}
            />
          </View>
        </View>

        <TravelMap
          depth={mapDepth}
          onBack={goBackMap}
          onDepthChange={navigateMap}
          visitedAreaCodes={visitedAreaCodes}
          visitedSigunguKeys={visitedSigunguKeys}
        />

        <View style={styles.statsRow}>
          <StatCard
            highlighted
            label="방문 시・도"
            suffix={`/${TOTAL_KTO_REGION_COUNT}`}
            value={visitedAreaCodes.size}
          />
          <StatCard
            label="기록한 관광지"
            suffix="곳"
            value={stats.data?.visitedPlaceCount ?? 0}
          />
        </View>

        <PrimaryButton
          accessibilityLabel="사진으로 기록 시작"
          label="사진으로 기록 시작"
          onPress={startPhotoRecord}
          style={styles.ctaButton}
        />

        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <AppText variant="subtitle02">최근 방문 기록</AppText>
            <Pressable
              accessibilityHint="전체 여행 기록 화면으로 이동합니다"
              accessibilityRole="button"
              hitSlop={8}
              onPress={openRecords}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <AppText tone="tertiary" variant="button06">
                전체 보기
              </AppText>
            </Pressable>
          </View>

          {recordsQuery.isPending ? (
            <View style={styles.recentState}>
              <AppText tone="placeholder" variant="body02">
                최근 기록을 불러오고 있어요.
              </AppText>
            </View>
          ) : recordsQuery.isError ? (
            <Pressable
              accessibilityHint="최근 여행 기록을 다시 불러옵니다"
              accessibilityRole="button"
              onPress={() => void recordsQuery.refetch()}
              style={({ pressed }) => [
                styles.recentState,
                pressed && styles.pressed,
              ]}
            >
              <AppText tone="tertiary" variant="body02">
                최근 기록을 불러오지 못했어요. 다시 시도
              </AppText>
            </Pressable>
          ) : recentRecords.length === 0 ? (
            <View style={styles.recentState}>
              <AppText tone="placeholder" variant="body02">
                첫 기록을 만들면 이곳에서 바로 확인할 수 있어요.
              </AppText>
            </View>
          ) : (
            <View style={styles.recentList}>
              {recentRecords.map((record) => (
                <Pressable
                  accessibilityHint="여행 기록 상세 화면으로 이동합니다"
                  accessibilityRole="button"
                  key={record.id}
                  onPress={() => openRecord(record.id)}
                  style={({ pressed }) => [
                    styles.recentCard,
                    pressed && styles.pressed,
                  ]}
                >
                  {record.photo ? (
                    <Image
                      accessibilityLabel={`${record.title} 대표 사진`}
                      resizeMode="cover"
                      source={record.photo}
                      style={styles.recentCardPhoto}
                    />
                  ) : (
                    <View
                      style={[
                        styles.recentCardPhoto,
                        styles.recentCardPhotoPlaceholder,
                      ]}
                    >
                      <AppText tone="placeholder" variant="caption02">
                        사진 없음
                      </AppText>
                    </View>
                  )}
                  <View style={styles.recentCardText}>
                    <AppText
                      numberOfLines={1}
                      tone="secondary"
                      variant="subtitle03"
                    >
                      {record.title}
                    </AppText>
                    <AppText
                      numberOfLines={1}
                      tone="placeholder"
                      variant="subtitle04"
                    >
                      {[record.dateRange, record.regions]
                        .filter(Boolean)
                        .join(" · ")}
                    </AppText>
                  </View>
                  <ChevronRightIcon height={16} width={16} />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.md,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    marginBottom: spacing.lg,
    marginTop: 3,
    maxWidth: 358,
    minHeight: 44,
    paddingLeft: 11,
    width: "100%",
  },
  headerTitle: {
    flex: 1,
    minWidth: 0,
  },
  headerActions: {
    flexShrink: 0,
    flexDirection: "row",
    gap: spacing.sm,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
    maxWidth: 358,
    minHeight: 94,
    width: "100%",
  },
  statCard: {
    backgroundColor: semanticColors.background.surface,
    borderRadius: radii.large,
    flex: 1,
    gap: spacing.xxs,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  statValueRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  highlightedStatValue: {
    color: semanticColors.brand.primary,
  },
  ctaButton: {
    marginTop: 19,
    maxWidth: 358,
  },
  recentSection: {
    marginTop: spacing.xxl,
    maxWidth: 358,
    width: "100%",
  },
  recentHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  recentList: {
    gap: spacing.sm,
  },
  recentCard: {
    alignItems: "center",
    backgroundColor: semanticColors.background.surface,
    borderRadius: radii.medium,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 72,
    padding: spacing.md,
  },
  recentCardText: {
    flex: 1,
    gap: spacing.xxs,
  },
  recentCardPhoto: {
    borderRadius: radii.small,
    height: 48,
    overflow: "hidden",
    width: 48,
  },
  recentCardPhotoPlaceholder: {
    alignItems: "center",
    backgroundColor: semanticColors.background.canvas,
    justifyContent: "center",
  },
  recentState: {
    alignItems: "center",
    backgroundColor: semanticColors.background.surface,
    borderRadius: radii.medium,
    justifyContent: "center",
    minHeight: 72,
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.72,
  },
});
