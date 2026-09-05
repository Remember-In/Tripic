export const palette = {
  primary: {
    50: "#F3F9E9",
    100: "#E1F0C8",
    200: "#CDE5A5",
    300: "#B8DB80",
    400: "#A8D363",
    500: "#99CB47",
    600: "#89BB3F",
    700: "#74A635",
    800: "#60922C",
    900: "#3D701B",
  },
  secondary: {
    50: "#FFF8E2",
    100: "#FFECB6",
    200: "#FFE188",
    300: "#FFD65A",
    400: "#FFCB3B",
    500: "#FFC228",
    600: "#FEB523",
    700: "#FDA220",
    800: "#FD921D",
    900: "#FC7318",
  },
  gray: {
    black: "#000000",
    50: "#F7F7F7",
    100: "#EEEEEE",
    200: "#E1E1E1",
    300: "#CFCFCF",
    400: "#AAAAAA",
    500: "#898989",
    600: "#626262",
    700: "#4F4F4F",
    800: "#313131",
    900: "#111111",
    white: "#FFFFFF",
  },
  background: "#FAFAFA",
  feedback: {
    error: {
      level1: "#FF383C",
      level2: "#FF4245",
      level3: "#FF6165",
    },
    information: {
      level1: "#0088FF",
      level2: "#0091FF",
      level3: "#5CB8FF",
    },
    success: {
      level1: "#34C759",
      level2: "#30D158",
      level3: "#4AE968",
    },
    warning: {
      level1: "#FFCC00",
      level2: "#FFD600",
      level3: "#FEDF43",
    },
  },
} as const;

export const semanticColors = {
  brand: {
    primary: palette.primary[500],
    secondary: palette.secondary[500],
  },
  background: {
    canvas: "#F5F5F5",
    page: palette.background,
    surface: palette.gray.white,
  },
  border: {
    default: palette.gray[400],
    disabled: palette.gray[300],
    strong: palette.gray[500],
  },
  feedback: palette.feedback,
  text: {
    disabled: palette.gray[400],
    inverse: palette.gray.white,
    placeholder: palette.gray[500],
    primary: palette.gray[900],
    secondary: palette.gray[700],
    tertiary: palette.gray[600],
  },
} as const;

export type TextColorRole = keyof typeof semanticColors.text;
