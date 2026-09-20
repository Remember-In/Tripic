import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

import { palette, semanticColors } from "@/shared/config/theme";

export function BrandSplash() {
  return (
    <View style={styles.screen}>
      <StatusBar backgroundColor={semanticColors.brand.primary} style="dark" />
      <View style={styles.brand}>
        <Text style={styles.name}>Tripic</Text>
        <Text style={styles.tagline}>사진으로 기록하는 나의 여행</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: {
    alignItems: "center",
    gap: 4,
  },
  name: {
    color: palette.gray.white,
    fontSize: 48,
    fontWeight: "700",
    letterSpacing: -1.5,
    lineHeight: 58,
  },
  screen: {
    alignItems: "center",
    backgroundColor: semanticColors.brand.primary,
    flex: 1,
    justifyContent: "center",
  },
  tagline: {
    color: palette.gray.white,
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 22,
  },
});
