import { type Href, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import {
  travelRecordSummaries,
  type RecordFilter,
  type TravelRecordSummary,
} from "@/entities/travel-record";
import { useCreateRecordSession } from "@/features/create-record-session";
import { spacing } from "@/shared/config/theme";
import { PageHeader, Screen } from "@/shared/ui";
import { RecordsList } from "@/widgets/records-list";

export function RecordsPage() {
  const router = useRouter();
  const { completedRecord } = useCreateRecordSession();
  const [filter, setFilter] = useState<RecordFilter>("recent");
  const records = useMemo<readonly TravelRecordSummary[]>(() => {
    if (!completedRecord) {
      return travelRecordSummaries;
    }

    const firstDate = completedRecord.days[0]?.date ?? "";
    const lastDate = completedRecord.days.at(-1)?.date ?? firstDate;

    return [
      {
        dateRange:
          firstDate === lastDate ? firstDate : `${firstDate}-${lastDate}`,
        id: completedRecord.id,
        regions: completedRecord.place.address,
        title: completedRecord.title,
      },
      ...travelRecordSummaries,
    ];
  }, [completedRecord]);

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
          <RecordsList
            filter={filter}
            onFilterChange={setFilter}
            onOpenRecord={(recordId) =>
              router.push(`/records/${recordId}` as Href)
            }
            records={records}
          />
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
});
