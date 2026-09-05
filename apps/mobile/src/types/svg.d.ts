declare module "*.svg" {
  import type { ComponentType } from "react";
  import type { SvgProps } from "react-native-svg";

  const SvgComponent: ComponentType<SvgProps>;
  export default SvgComponent;
}

declare module "*.otf" {
  const fontSource: number;
  export default fontSource;
}

declare module "*.jpg" {
  import type { ImageSourcePropType } from "react-native";

  const source: ImageSourcePropType;
  export default source;
}

declare module "*.png" {
  import type { ImageSourcePropType } from "react-native";

  const source: ImageSourcePropType;
  export default source;
}
