import { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Path, Text as SvgText } from "react-native-svg";

import {
  KTO_REGIONS,
  createKtoSigunguKey,
  getRegionByAreaCode,
  type KtoAreaCode,
  type KtoSigunguKey,
  type Region,
} from "@/entities/region";
import { palette, radii, semanticColors, spacing } from "@/shared/config/theme";
import { AppText } from "@/shared/ui";

import {
  getDistrictByCode,
  getDistrictMap,
  getDistrictViewBox,
  type DistrictGeometry,
} from "./model/districtGeometry";
import {
  KOREA_MAP_VIEW_BOX,
  KOREA_SCHEMATIC_GEOMETRY,
} from "./model/koreaSchematicGeometry";
import {
  COUNTRY_MAP_DEPTH,
  areaMapDepth,
  mapDepthLabel,
  previousMapDepth,
  sigunguMapDepth,
  type TravelMapDepth,
} from "./model/travelMapState";

export type TravelMapProps = {
  depth?: TravelMapDepth;
  onBack?: () => void;
  onDepthChange?: (depth: TravelMapDepth) => void;
  onSelectRegion?: (region: Region) => void;
  visitedAreaCodes?: ReadonlySet<KtoAreaCode>;
  visitedSigunguKeys?: ReadonlySet<KtoSigunguKey>;
  /** @deprecated 방문 수는 visitedAreaCodes에서 계산한다. */
  visitedAreaCount?: number;
};

type ProvinceArtworkProps = {
  onSelectRegion?: (region: Region) => void;
  visitedAreaCodes: ReadonlySet<KtoAreaCode>;
};

type DistrictArtworkProps = {
  areaCode: KtoAreaCode;
  focusedSigunguCode?: string;
  onSelectDistrict?: (
    areaCode: KtoAreaCode,
    district: DistrictGeometry,
  ) => void;
  visitedAreaCodes: ReadonlySet<KtoAreaCode>;
  visitedSigunguKeys: ReadonlySet<KtoSigunguKey>;
};

const EMPTY_VISITED_AREA_CODES: ReadonlySet<KtoAreaCode> = new Set();
const EMPTY_VISITED_SIGUNGU_KEYS: ReadonlySet<KtoSigunguKey> = new Set();
function ProvinceArtwork({
  onSelectRegion,
  visitedAreaCodes,
}: ProvinceArtworkProps) {
  const regionStates = useMemo(
    () =>
      KOREA_SCHEMATIC_GEOMETRY.flatMap((geometry) => {
        const region = getRegionByAreaCode(geometry.areaCode);

        return region
          ? [
              {
                geometry,
                isVisited: visitedAreaCodes.has(geometry.areaCode),
                region,
              },
            ]
          : [];
      }),
    [visitedAreaCodes],
  );

  return (
    <View style={styles.provinceMapFrame}>
      <Svg
        accessibilityLabel="대한민국 17개 시·도 방문 지도"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        testID="travel-map-svg"
        viewBox={KOREA_MAP_VIEW_BOX}
        width="100%"
      >
        {regionStates.map(({ geometry, region }) => (
          <Path
            accessible={false}
            d={geometry.path}
            fill="transparent"
            key={`${region.id}-touch-target`}
            onPress={onSelectRegion ? () => onSelectRegion(region) : undefined}
            stroke="transparent"
            strokeLinejoin="round"
            strokeWidth={12}
            testID={`travel-map-region-${region.id}-touch-target`}
          />
        ))}

        {regionStates.map(({ geometry, isVisited, region }) => (
          <Path
            accessibilityLabel={`${region.name}, ${isVisited ? "방문" : "미방문"}, 선택하면 시군구 지도로 이동`}
            accessible
            d={geometry.path}
            fill={isVisited ? semanticColors.brand.primary : palette.gray[100]}
            fillRule="evenodd"
            key={region.id}
            onPress={onSelectRegion ? () => onSelectRegion(region) : undefined}
            stroke={palette.gray.white}
            strokeLinejoin="round"
            strokeWidth={2}
            testID={`travel-map-region-${region.id}`}
            vectorEffect="non-scaling-stroke"
          />
        ))}

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
    </View>
  );
}

function DistrictArtwork({
  areaCode,
  focusedSigunguCode,
  onSelectDistrict,
  visitedAreaCodes,
  visitedSigunguKeys,
}: DistrictArtworkProps) {
  const region = getRegionByAreaCode(areaCode);
  const districtMap = getDistrictMap(areaCode);
  const focusedDistrict = focusedSigunguCode
    ? getDistrictByCode(areaCode, focusedSigunguCode)
    : undefined;
  const viewBox = getDistrictViewBox(areaCode, focusedSigunguCode);

  if (!region || !districtMap || !viewBox) {
    return null;
  }

  const [, , viewBoxWidth = 0, viewBoxHeight = 0] = districtMap.viewBox
    .trim()
    .split(/\s+/)
    .map(Number);
  const touchStrokeWidth = Math.max(
    16,
    Math.min(viewBoxWidth, viewBoxHeight) * 0.035,
  );
  const focusedLabelFontSize = Math.max(28, districtMap.labelFontSize);

  const isDistrictVisited = (district: DistrictGeometry) => {
    if (!district.sigunguCode) {
      return visitedAreaCodes.has(areaCode);
    }

    const progressKey = createKtoSigunguKey(areaCode, district.sigunguCode);
    return Boolean(progressKey && visitedSigunguKeys.has(progressKey));
  };

  const selectDistrict = (district: DistrictGeometry) => {
    if (!district.sigunguCode) {
      return;
    }

    onSelectDistrict?.(areaCode, district);
  };

  return (
    <View style={styles.districtMapFrame}>
      <Svg
        accessibilityLabel={
          focusedDistrict
            ? `${region.name} ${focusedDistrict.name} 지도`
            : `${region.name} 시군구 지도`
        }
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        testID="travel-map-district-svg"
        viewBox={viewBox}
        width="100%"
      >
        {!focusedDistrict &&
          districtMap.districts
            .filter((district) => district.sigunguCode)
            .map((district) => (
              <Path
                accessible={false}
                d={district.path}
                fill="transparent"
                key={`${district.sigunguCode ?? district.name}-touch-target`}
                onPress={() => selectDistrict(district)}
                stroke="transparent"
                strokeLinejoin="round"
                strokeWidth={touchStrokeWidth}
                testID={`travel-map-sigungu-${district.sigunguCode}-touch-target`}
              />
            ))}

        {districtMap.districts
          .filter(
            (district) =>
              !focusedDistrict ||
              district.sigunguCode === focusedDistrict.sigunguCode,
          )
          .map((district) => {
            const isSelected = focusedSigunguCode === district.sigunguCode;
            const isVisited = isDistrictVisited(district);
            const canDrillDown =
              focusedDistrict === undefined && Boolean(district.sigunguCode);

            return (
              <Path
                accessibilityLabel={`${district.name}, ${isVisited ? "방문" : "미방문"}${isSelected ? ", 선택됨" : ""}${canDrillDown ? ", 선택하면 확대" : ""}`}
                accessible
                d={district.path}
                fill={
                  isVisited ? semanticColors.brand.primary : palette.gray[100]
                }
                fillRule="evenodd"
                key={district.sigunguCode ?? district.name}
                onPress={
                  canDrillDown ? () => selectDistrict(district) : undefined
                }
                stroke={
                  isSelected
                    ? semanticColors.brand.secondary
                    : palette.gray.white
                }
                strokeLinejoin="round"
                strokeWidth={isSelected ? 3 : 2}
                testID={`travel-map-sigungu-${district.sigunguCode ?? "area"}`}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}

        {districtMap.districts
          .filter(
            (district) =>
              !focusedDistrict ||
              district.sigunguCode === focusedDistrict.sigunguCode,
          )
          .map((district) => {
            const isSelected = focusedSigunguCode === district.sigunguCode;
            const isVisited = isDistrictVisited(district);

            return (
              <SvgText
                fill={
                  isVisited || isSelected
                    ? palette.gray[900]
                    : palette.gray[600]
                }
                fontSize={
                  focusedDistrict
                    ? focusedLabelFontSize
                    : districtMap.labelFontSize
                }
                fontWeight="600"
                key={`${district.sigunguCode}-label`}
                pointerEvents="none"
                textAnchor="middle"
                x={district.labelX}
                y={district.labelY}
              >
                {district.name}
              </SvgText>
            );
          })}
      </Svg>
    </View>
  );
}

export function TravelMap({
  depth = COUNTRY_MAP_DEPTH,
  onBack,
  onDepthChange,
  onSelectRegion,
  visitedAreaCodes = EMPTY_VISITED_AREA_CODES,
  visitedAreaCount,
  visitedSigunguKeys = EMPTY_VISITED_SIGUNGU_KEYS,
}: TravelMapProps) {
  const visibleVisitedAreaCount = visitedAreaCount ?? visitedAreaCodes.size;
  const label = mapDepthLabel(depth);

  const selectRegion = useCallback(
    (region: Region) => {
      onSelectRegion?.(region);
      onDepthChange?.(areaMapDepth(region.areaCode));
    },
    [onDepthChange, onSelectRegion],
  );

  const selectDistrict = useCallback(
    (areaCode: KtoAreaCode, district: DistrictGeometry) => {
      if (!district.sigunguCode) {
        return;
      }

      onDepthChange?.(sigunguMapDepth(areaCode, district.sigunguCode));
    },
    [onDepthChange],
  );

  const goBack = useCallback(() => {
    if (onBack) {
      onBack();
      return;
    }

    onDepthChange?.(previousMapDepth(depth));
  }, [depth, onBack, onDepthChange]);

  const accessibilityLabel = useMemo(
    () =>
      `${label} 여행 지도. 방문한 시·도 ${visibleVisitedAreaCount}곳, 전체 ${KTO_REGIONS.length}곳`,
    [label, visibleVisitedAreaCount],
  );
  const caption =
    depth.level === "country"
      ? `방문한 시·도 ${visibleVisitedAreaCount}/${KTO_REGIONS.length}`
      : label;
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={styles.card}
      testID="travel-map"
    >
      {depth.level !== "country" ? (
        <DistrictArtwork
          areaCode={depth.areaCode}
          focusedSigunguCode={
            depth.level === "sigungu" ? depth.sigunguCode : undefined
          }
          onSelectDistrict={selectDistrict}
          visitedAreaCodes={visitedAreaCodes}
          visitedSigunguKeys={visitedSigunguKeys}
        />
      ) : (
        <ProvinceArtwork
          onSelectRegion={selectRegion}
          visitedAreaCodes={visitedAreaCodes}
        />
      )}

      <Pressable
        accessibilityHint={
          depth.level === "country"
            ? undefined
            : "이전 범위의 지도로 돌아갑니다"
        }
        accessibilityLabel={
          depth.level === "country" ? caption : `${caption}, 이전 지도 보기`
        }
        accessibilityRole={depth.level === "country" ? "text" : "button"}
        disabled={depth.level === "country"}
        hitSlop={12}
        onPress={goBack}
        style={({ pressed }) => [
          styles.caption,
          pressed && styles.captionPressed,
        ]}
        testID="travel-map-caption"
      >
        <AppText
          testID="travel-map-label"
          tone="placeholder"
          variant="subtitle03"
        >
          {caption}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    bottom: spacing.lg,
    position: "absolute",
    right: spacing.lg,
  },
  captionPressed: {
    opacity: 0.6,
  },
  card: {
    aspectRatio: 358 / 483,
    backgroundColor: semanticColors.background.surface,
    borderRadius: radii.large,
    maxWidth: 358,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  districtMapFrame: {
    height: "63.89%",
    left: "15.08%",
    position: "absolute",
    top: "13.66%",
    width: "70.11%",
  },
  provinceMapFrame: {
    bottom: 38,
    left: spacing.md,
    position: "absolute",
    right: spacing.md,
    top: spacing.md,
  },
});
