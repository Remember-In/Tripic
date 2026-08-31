import type { ComponentType } from "react";
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import type { SvgProps } from "react-native-svg";

import { radii, shadows } from "@/shared/config/theme";

export type FloatingIconButtonProps = {
  accessibilityLabel: string;
  icon: ComponentType<SvgProps>;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function FloatingIconButton({
  accessibilityLabel,
  icon: Icon,
  onPress,
  style,
}: FloatingIconButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        shadows.floating,
        style,
        pressed && styles.pressed,
      ]}
    >
      <Icon height={24} width={24} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.88)",
    borderRadius: radii.pill,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  pressed: {
    opacity: 0.72,
  },
});
