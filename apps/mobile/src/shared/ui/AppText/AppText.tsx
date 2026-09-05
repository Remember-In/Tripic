import { StyleSheet, Text, type TextProps } from "react-native";

import {
  semanticColors,
  typography,
  type TextColorRole,
  type TypographyVariant,
} from "@/shared/config/theme";

export type AppTextProps = TextProps & {
  tone?: TextColorRole;
  variant?: TypographyVariant;
};

export function AppText({
  style,
  tone = "primary",
  variant = "body01",
  ...textProps
}: AppTextProps) {
  return (
    <Text
      {...textProps}
      style={[typography[variant], toneStyles[tone], style]}
    />
  );
}

const toneStyles = StyleSheet.create({
  disabled: { color: semanticColors.text.disabled },
  inverse: { color: semanticColors.text.inverse },
  placeholder: { color: semanticColors.text.placeholder },
  primary: { color: semanticColors.text.primary },
  secondary: { color: semanticColors.text.secondary },
  tertiary: { color: semanticColors.text.tertiary },
});
