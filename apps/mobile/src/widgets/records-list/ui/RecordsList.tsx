import { Pressable, StyleSheet, View } from "react-native";

import {
  travelRecordSummaries,
  type RecordFilter,
  type TravelRecordSummary,
} from "@/entities/travel-record";
import { ChevronRightIcon } from "@/shared/assets/icons";
import { palette, radii, semanticColors, spacing } from "@/shared/config/theme";
import { AppText } from "@/shared/ui";

export type RecordsListProps = {
  filter: RecordFilter;
  onFilterChange: (filter: RecordFilter) => void;
  onOpenRecord: (recordId: string) => void;
  records?: readonly TravelRecordSummary[];
};

const filters: readonly { label: string; value: RecordFilter }[] = [
  { label: "최근순", value: "recent" },
  { label: "지역", value: "region" },
];

export function RecordsList({
  filter,
  onFilterChange,
  onOpenRecord,
  records = travelRecordSummaries,
}: RecordsListProps) {
  return (
    <View>
      <View accessibilityRole="tablist" style={styles.filters}>
        {filters.map((item) => {
          const isActive = filter === item.value;

          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              key={item.value}
              onPress={() => onFilterChange(item.value)}
              style={({ pressed }) => [
                styles.filter,
                isActive ? styles.activeFilter : styles.inactiveFilter,
                pressed && styles.pressed,
              ]}
            >
              <AppText
                tone={isActive ? "inverse" : "secondary"}
                variant="subtitle03"
              >
                {item.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.list}>
        {records.map((record) => (
          <Pressable
            accessibilityHint="여행 기록 상세 화면으로 이동합니다"
            accessibilityRole="button"
            key={record.id}
            onPress={() => onOpenRecord(record.id)}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <View style={styles.cardText}>
              <AppText tone="secondary" variant="subtitle03">
                {record.title}
              </AppText>
              <AppText tone="placeholder" variant="subtitle04">
                {filter === "recent" ? record.dateRange : record.regions}
              </AppText>
            </View>
            <ChevronRightIcon height={16} width={16} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  filters: {
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  filter: {
    alignItems: "center",
    borderRadius: radii.pill,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  activeFilter: {
    backgroundColor: palette.gray[900],
    borderColor: palette.gray[900],
    borderWidth: 1,
  },
  inactiveFilter: {
    backgroundColor: semanticColors.background.surface,
    borderColor: semanticColors.border.disabled,
    borderWidth: 1,
  },
  list: {
    gap: spacing.md,
  },
  card: {
    alignItems: "center",
    backgroundColor: semanticColors.background.surface,
    borderRadius: radii.medium,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 76,
    padding: spacing.md,
  },
  cardText: {
    flex: 1,
    gap: spacing.xs,
  },
  pressed: {
    opacity: 0.72,
  },
});
