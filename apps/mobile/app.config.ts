import type { ConfigContext, ExpoConfig } from "expo/config";

import appJson from "./app.json";

const baseConfig = appJson.expo as ExpoConfig;

export default function defineExpoConfig({
  config,
}: ConfigContext): ExpoConfig {
  const nativeAppKey = process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY?.trim();
  const plugins = [...(baseConfig.plugins ?? [])];

  if (nativeAppKey) {
    plugins.push([
      "@react-native-kakao/core",
      {
        android: { authCodeHandlerActivity: true },
        ios: { handleKakaoOpenUrl: true },
        nativeAppKey,
      },
    ]);
  }

  return {
    ...config,
    ...baseConfig,
    plugins,
  };
}
