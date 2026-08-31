import type { ViewStyle } from "react-native";

import { palette } from "./colors";

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  small: 8,
  medium: 12,
  large: 20,
  pill: 999,
} as const;

export const shadows = {
  floating: {
    elevation: 4,
    shadowColor: palette.gray.black,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
  } satisfies ViewStyle,
  sheet: {
    elevation: 12,
    shadowColor: palette.gray.black,
    shadowOffset: { height: 15, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 37.5,
  } satisfies ViewStyle,
} as const;
