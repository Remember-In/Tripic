import { StatusBar } from "expo-status-bar";
import type { PropsWithChildren } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { semanticColors } from "@/shared/config/theme";

export type ScreenProps = PropsWithChildren<{
  statusBarBackgroundColor?: string;
  statusBarStyle?: "auto" | "inverted" | "light" | "dark";
  style?: StyleProp<ViewStyle>;
}>;

export function Screen({
  children,
  statusBarBackgroundColor = semanticColors.background.canvas,
  statusBarStyle = "dark",
  style,
}: ScreenProps) {
  return (
    <SafeAreaView edges={["top", "bottom"]} style={[styles.screen, style]}>
      <StatusBar
        backgroundColor={statusBarBackgroundColor}
        style={statusBarStyle}
      />
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: "center",
    flex: 1,
    maxWidth: 390,
    width: "100%",
  },
  screen: {
    backgroundColor: semanticColors.background.canvas,
    flex: 1,
  },
});
