import type { TextStyle } from "react-native";

import { fontFamilies } from "@/shared/assets/fonts";

function createTextStyle(
  fontFamily: (typeof fontFamilies)[keyof typeof fontFamilies],
  fontSize: number,
  lineHeight: number,
): TextStyle {
  return {
    fontFamily,
    fontSize,
    letterSpacing: 0,
    lineHeight,
  };
}

export const typography = {
  heading01: createTextStyle(fontFamilies.bold, 32, 38.4),
  heading02: createTextStyle(fontFamilies.bold, 28, 33.6),
  heading03: createTextStyle(fontFamilies.bold, 24, 28.8),
  heading04: createTextStyle(fontFamilies.bold, 22, 26.4),
  subtitle01: createTextStyle(fontFamilies.semiBold, 20, 24),
  subtitle02: createTextStyle(fontFamilies.semiBold, 18, 21.6),
  subtitle03: createTextStyle(fontFamilies.semiBold, 16, 19.2),
  subtitle04: createTextStyle(fontFamilies.semiBold, 14, 16.8),
  body01: createTextStyle(fontFamilies.regular, 16, 25.6),
  body02: createTextStyle(fontFamilies.regular, 14, 22.4),
  caption01: createTextStyle(fontFamilies.regular, 14, 19.6),
  caption02: createTextStyle(fontFamilies.regular, 12, 16.8),
  button01: createTextStyle(fontFamilies.bold, 20, 28),
  button02: createTextStyle(fontFamilies.bold, 18, 25.2),
  button03: createTextStyle(fontFamilies.bold, 16, 22.4),
  button04: createTextStyle(fontFamilies.regular, 16, 22.4),
  button05: createTextStyle(fontFamilies.bold, 14, 19.6),
  button06: createTextStyle(fontFamilies.regular, 14, 19.6),
} as const;

export type TypographyVariant = keyof typeof typography;
