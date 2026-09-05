import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Path, Text as SvgText } from "react-native-svg";

import {
  KTO_REGIONS,
  getRegionByAreaCode,
  type KtoAreaCode,
  type Region,
} from "@/entities/region";
import { palette, radii, semanticColors, spacing } from "@/shared/config/theme";
import { AppText } from "@/shared/ui";

import {
  KOREA_MAP_VIEW_BOX,
  KOREA_SCHEMATIC_GEOMETRY,
} from "./model/koreaSchematicGeometry";

export type TravelMapProps = {
  onSelectRegion?: (region: Region) => void;
  selectedAreaCode?: KtoAreaCode | null;
  visitedAreaCodes?: ReadonlySet<KtoAreaCode>;
  /** @deprecated HomePage가 지역 데이터와 연결되는 동안만 지원한다. */
  visitedAreaCount?: number;
};

const EMPTY_VISITED_AREA_CODES: ReadonlySet<KtoAreaCode> = new Set();

export function TravelMap({
  onSelectRegion,
  selectedAreaCode,
  visitedAreaCodes = EMPTY_VISITED_AREA_CODES,
  visitedAreaCount,
}: TravelMapProps) {
  const selectedRegion = selectedAreaCode
    ? getRegionByAreaCode(selectedAreaCode)
    : undefined;
  const visibleVisitedAreaCount = visitedAreaCount ?? visitedAreaCodes.size;

  const regionStates = useMemo(
    () =>
      KOREA_SCHEMATIC_GEOMETRY.map((geometry) => {
        const region = getRegionByAreaCode(geometry.areaCode);

        if (!region) {
          return null;
        }

        return {
          geometry,
          isSelected: selectedAreaCode === geometry.areaCode,
          isVisited: visitedAreaCodes.has(geometry.areaCode),
          region,
        };
      }).filter((state) => state !== null),
    [selectedAreaCode, visitedAreaCodes],
  );

  return (
    <View
      accessibilityLabel={`대한민국 여행 지도. 방문한 시·도 ${visibleVisitedAreaCount}곳, 전체 ${KTO_REGIONS.length}곳`}
      style={styles.card}
      testID="travel-map"
    >
      <Svg
        accessibilityLabel="대한민국 17개 시·도 방문 지도"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        testID="travel-map-svg"
        viewBox={KOREA_MAP_VIEW_BOX}
        width="100%"
      >
        {regionStates.map(({ geometry, isSelected, isVisited, region }) => {
          const fill = isVisited
            ? semanticColors.brand.primary
            : palette.gray[100];
          const stroke = isSelected
            ? semanticColors.brand.secondary
            : palette.gray.white;

          return (
            <Path
              accessibilityLabel={`${region.name}, ${isVisited ? "방문" : "미방문"}${isSelected ? ", 선택됨" : ""}`}
              accessible
              d={geometry.path}
              fill={fill}
              key={region.id}
              onPress={
                onSelectRegion ? () => onSelectRegion(region) : undefined
              }
              stroke={stroke}
              strokeLinejoin="round"
              strokeWidth={isSelected ? 4 : 2}
              testID={`travel-map-region-${region.id}`}
            />
          );
        })}

        {regionStates.map(({ geometry, isVisited, region }) => (
          <SvgText
            fill={isVisited ? palette.gray[900] : palette.gray[600]}
            fontSize={9}
            fontWeight="600"
            key={`${region.id}-label`}
            pointerEvents="none"
            textAnchor="middle"
            x={geometry.labelX}
            y={geometry.labelY}
          >
            {region.shortName}
          </SvgText>
        ))}
      </Svg>

      <View pointerEvents="none" style={styles.caption}>
        <AppText
          testID="travel-map-label"
          tone="placeholder"
          variant="caption02"
        >
          {selectedRegion
            ? `${selectedRegion.name} · ${visitedAreaCodes.has(selectedRegion.areaCode) ? "방문" : "미방문"}`
            : `방문한 시·도 ${visibleVisitedAreaCount}/${KTO_REGIONS.length}`}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    bottom: spacing.md,
    position: "absolute",
    right: spacing.lg,
  },
  card: {
    aspectRatio: 358 / 483,
    backgroundColor: semanticColors.background.surface,
    borderRadius: radii.large,
    maxWidth: 358,
    overflow: "hidden",
    paddingBottom: 38,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    position: "relative",
    width: "100%",
  },
});
