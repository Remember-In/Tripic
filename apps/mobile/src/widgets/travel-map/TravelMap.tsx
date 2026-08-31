import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import DaeguDetail from "@/shared/assets/home/daegu-detail.svg";
import DaeguOverlay from "@/shared/assets/home/daegu-overlay.svg";
import DaeguZoomOverlay from "@/shared/assets/home/daegu-zoom-overlay.svg";
import SouthKorea from "@/shared/assets/home/south-korea.svg";
import { radii, semanticColors, spacing } from "@/shared/config/theme";
import { AppText } from "@/shared/ui";

const MAP_DEPTHS = [
  "대한민국",
  "경상북도",
  "대구광역시",
  "대구광역시 수성구",
] as const;

type MapDepth = (typeof MAP_DEPTHS)[number];

type MapArtworkProps = {
  depth: MapDepth;
};

function MapArtwork({ depth }: MapArtworkProps) {
  if (depth === "대한민국") {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <SouthKorea style={styles.countryMap} />
        <DaeguOverlay style={styles.countryDaegu} />
      </View>
    );
  }

  if (depth === "경상북도") {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <SouthKorea style={styles.gyeongbukMap} />
        <DaeguZoomOverlay style={styles.gyeongbukDaegu} />
      </View>
    );
  }

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <DaeguDetail style={styles.daeguMap} />
    </View>
  );
}

type TravelMapProps = {
  visitedAreaCount: number;
};

export function TravelMap({ visitedAreaCount }: TravelMapProps) {
  const [depthIndex, setDepthIndex] = useState(0);
  const depth = MAP_DEPTHS[depthIndex];

  const showNextDepth = useCallback(() => {
    setDepthIndex((currentDepth) => (currentDepth + 1) % MAP_DEPTHS.length);
  }, []);

  return (
    <Pressable
      accessibilityHint="탭할 때마다 경상북도, 대구광역시, 수성구 순서로 지도를 확대합니다."
      accessibilityLabel={`${depth} 여행 지도. 방문한 시·군 ${visitedAreaCount}곳`}
      accessibilityRole="button"
      onPress={showNextDepth}
      style={styles.card}
      testID="travel-map"
    >
      <MapArtwork depth={depth} />
      <AppText
        style={styles.mapLabel}
        testID="travel-map-label"
        tone="placeholder"
        variant="subtitle03"
      >
        {depth}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    aspectRatio: 358 / 483,
    backgroundColor: semanticColors.background.surface,
    borderRadius: radii.large,
    maxWidth: 358,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  countryMap: {
    height: "72.06%",
    left: "4.19%",
    position: "absolute",
    top: "12.42%",
    width: "91.62%",
  },
  countryDaegu: {
    height: "3.33%",
    left: "64.11%",
    position: "absolute",
    top: "44.41%",
    width: "3.67%",
  },
  gyeongbukMap: {
    height: "170.05%",
    left: "-88.27%",
    position: "absolute",
    top: "-33.54%",
    width: "216.2%",
  },
  gyeongbukDaegu: {
    height: "12.22%",
    left: "48.04%",
    position: "absolute",
    top: "36.44%",
    width: "13.41%",
  },
  daeguMap: {
    height: "63.89%",
    left: "15.08%",
    position: "absolute",
    top: "13.66%",
    width: "70.11%",
  },
  mapLabel: {
    bottom: spacing.lg,
    position: "absolute",
    right: spacing.lg,
    textAlign: "right",
  },
});
