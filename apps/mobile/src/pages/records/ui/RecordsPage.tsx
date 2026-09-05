import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import type { RecordFilter } from "@/entities/travel-record";
import {
  mapLocalRecordSummaryToDisplay,
  useLocalRecordsQuery,
} from "@/features/local-records";
import { semanticColors, spacing } from "@/shared/config/theme";
import { AppText, PageHeader, Screen } from "@/shared/ui";
import { RecordsList } from "@/widgets/records-list";

export function RecordsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<RecordFilter>("recent");
  const recordsQuery = useLocalRecordsQuery();
  const records = useMemo(() => {
    const mapped = (recordsQuery.data ?? []).map(
      mapLocalRecordSummaryToDisplay,
    );
    return filter === "region"
      ? [...mapped].sort((left, right) =>
          (left.regions ?? "").localeCompare(right.regions ?? "", "ko"),
        )
      : mapped;
  }, [filter, recordsQuery.data]);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/");
  };

  return (
    <Screen>
      <View style={styles.page}>
        <PageHeader
          onBackPress={goBack}
          style={styles.header}
          title="내 여행 기록"
        />
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {recordsQuery.isPending ? (
            <View style={styles.stateCard}>
              <ActivityIndicator
                color={semanticColors.brand.primary}
                size="small"
              />
              <AppText tone="tertiary" variant="body02">
                기록을 불러오고 있어요.
              </AppText>
            </View>
          ) : recordsQuery.isError ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void recordsQuery.refetch()}
              style={({ pressed }) => [
                styles.stateCard,
                pressed && styles.pressed,
              ]}
            >
              <AppText tone="secondary" variant="body02">
                기록을 불러오지 못했어요.
              </AppText>
              <AppText style={styles.retryText} variant="button06">
                다시 시도
              </AppText>
            </Pressable>
          ) : records.length === 0 ? (
            <View style={styles.stateCard}>
              <AppText variant="subtitle03">아직 여행 기록이 없어요.</AppText>
              <AppText tone="tertiary" variant="body02">
                첫 사진 기록으로 여행 지도를 채워보세요.
              </AppText>
            </View>
          ) : (
            <RecordsList
              filter={filter}
              onFilterChange={setFilter}
              onOpenRecord={(recordId) =>
                router.push({
                  params: { recordId },
                  pathname: "/records/[recordId]",
                })
              }
              records={records}
            />
          )}
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: 3,
  },
  header: {
    marginBottom: spacing.lg,
  },
  content: {
    paddingBottom: spacing.lg,
  },
  pressed: {
    opacity: 0.72,
  },
  retryText: {
    color: semanticColors.brand.primary,
  },
  stateCard: {
    alignItems: "center",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 180,
    padding: spacing.lg,
  },
});
