import type { ImageSourcePropType } from "react-native";

import photo03 from "./56f0e5cb-41da-4204-b5db-db1e30d507b8.jpg";
import photo04 from "./ed33ad55-973e-4b01-b102-5f2ec8ea2575.jpg";
import photo02 from "./bd1a6508-cddf-4447-a150-fa84b9575ed3.jpg";
import photo01 from "./cb5770b0-77bd-4909-b686-eaeadbb0af03.jpg";

export const recordPhotoSources = [
  photo01,
  photo02,
  photo03,
  photo04,
] as const satisfies readonly ImageSourcePropType[];

export const gyeongjuWorldPhoto: ImageSourcePropType = photo01;
