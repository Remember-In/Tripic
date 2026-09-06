import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { radii, semanticColors, spacing } from "@/shared/config/theme";
import { AppText } from "@/shared/ui/AppText";

export type PrimaryButtonProps = {
  accessibilityLabel?: string;
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({
  accessibilityLabel,
  disabled = false,
  label,
  loading = false,
  onPress,
  style,
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isDisabled && styles.disabled,
        style,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={semanticColors.text.inverse} size="small" />
      ) : (
        <AppText style={styles.label} tone="inverse" variant="button02">
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: semanticColors.brand.primary,
    borderRadius: radii.large,
    justifyContent: "center",
    minHeight: 60,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    width: "100%",
  },
  disabled: {
    backgroundColor: semanticColors.border.disabled,
  },
  pressed: {
    opacity: 0.72,
  },
  label: {
    flexShrink: 1,
    textAlign: "center",
  },
});
