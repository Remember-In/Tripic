import { Pressable, ScrollView, StyleSheet } from "react-native";

import { KTO_REGIONS, type KtoAreaCode, type Region } from "@/entities/region";
import { palette, radii, semanticColors, spacing } from "@/shared/config/theme";
import { AppText } from "@/shared/ui";

type RegionOption = Pick<Region, "areaCode" | "name" | "shortName"> | null;

export type RegionSelectorProps = {
  onSelect: (areaCode: KtoAreaCode | null) => void;
  selectedAreaCode: KtoAreaCode | null | undefined;
};

export function RegionSelector({
  onSelect,
  selectedAreaCode,
}: RegionSelectorProps) {
  const options: readonly RegionOption[] = [null, ...KTO_REGIONS];

  return (
    <ScrollView
      accessibilityLabel="관광지 탐색 지역"
      contentContainerStyle={styles.options}
      horizontal
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
    >
      {options.map((region) => {
        const areaCode = region?.areaCode ?? null;
        const selected = selectedAreaCode === areaCode;

        return (
          <Pressable
            accessibilityLabel={
              region ? `${region.name} 선택` : "전체 지역 선택"
            }
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            key={areaCode ?? "all"}
            onPress={() => onSelect(areaCode)}
            style={({ pressed }) => [
              styles.option,
              selected && styles.selectedOption,
              pressed && styles.pressed,
            ]}
          >
            <AppText
              style={selected ? styles.selectedLabel : styles.label}
              variant="body02"
            >
              {region?.shortName ?? "전체"}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: {
    color: semanticColors.text.secondary,
  },
  option: {
    alignItems: "center",
    backgroundColor: semanticColors.background.surface,
    borderColor: palette.gray[200],
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: spacing.md,
  },
  options: {
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  pressed: {
    opacity: 0.72,
  },
  selectedLabel: {
    color: palette.primary[900],
  },
  selectedOption: {
    backgroundColor: palette.primary[50],
    borderColor: semanticColors.brand.primary,
  },
});
