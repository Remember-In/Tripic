import { useRouter, type Href } from "expo-router";
import { useCallback } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { useCreateRecordSession } from "@/features/create-record-session";
import RecordIcon from "@/shared/assets/home/record.svg";
import { SettingsIcon } from "@/shared/assets/icons";
import { radii, semanticColors, spacing } from "@/shared/config/theme";
import {
  AppText,
  FloatingIconButton,
  PrimaryButton,
  Screen,
} from "@/shared/ui";
import { TravelMap } from "@/widgets/travel-map";

const VISITED_AREA_COUNT = 3;
const TOTAL_AREA_COUNT = 157;
const RECORDED_PLACE_COUNT = 8;

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

  const openRecords = useCallback(() => {
    router.push("/records" as Href);
  }, [router]);

  const openSettings = useCallback(() => {
    router.push("/settings" as Href);
  }, [router]);

  const startPhotoRecord = useCallback(() => {
    resetDraft();
    router.push("/records/new/photos" as Href);
  }, [resetDraft, router]);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <AppText variant="heading01">여행 지도</AppText>
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

        <TravelMap visitedAreaCount={VISITED_AREA_COUNT} />

        <View style={styles.statsRow}>
          <StatCard
            highlighted
            label="방문 시・군"
            suffix={`/${TOTAL_AREA_COUNT}`}
            value={VISITED_AREA_COUNT}
          />
          <StatCard
            label="기록한 관광지"
            suffix="곳"
            value={RECORDED_PLACE_COUNT}
          />
        </View>

        <PrimaryButton
          accessibilityLabel="사진으로 기록 시작"
          label="사진으로 기록 시작"
          onPress={startPhotoRecord}
          style={styles.ctaButton}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    height: 44,
    justifyContent: "space-between",
    marginBottom: spacing.lg,
    marginTop: 3,
    maxWidth: 358,
    paddingLeft: 11,
    width: "100%",
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.md,
    height: 94,
    marginTop: spacing.lg,
    maxWidth: 358,
    width: "100%",
  },
  statCard: {
    backgroundColor: semanticColors.background.surface,
    borderRadius: radii.large,
    flex: 1,
    gap: spacing.xxs,
    justifyContent: "center",
    overflow: "hidden",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  statValueRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  highlightedStatValue: {
    color: semanticColors.brand.primary,
  },
  ctaButton: {
    marginTop: 19,
    maxWidth: 358,
  },
});
