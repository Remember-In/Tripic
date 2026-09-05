import Constants from "expo-constants";
import { Platform } from "react-native";

const unavailableMessage =
  "카카오 로그인은 Expo Go에서 사용할 수 없어요. 카카오 모듈이 포함된 개발 빌드나 TestFlight 앱에서 다시 시도해 주세요.";

let initializedAppKey: string | null = null;
let initializationPromise: Promise<void> | null = null;

export class KakaoLoginUnavailableError extends Error {
  constructor(message = unavailableMessage) {
    super(message);
    this.name = "KakaoLoginUnavailableError";
  }
}

function getNativeAppKey() {
  const nativeAppKey = process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY?.trim();

  if (!nativeAppKey) {
    throw new KakaoLoginUnavailableError(
      "카카오 로그인을 사용하려면 EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY를 설정한 뒤 앱을 다시 빌드해 주세요.",
    );
  }

  return nativeAppKey;
}

function isNativeModuleUnavailable(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return [
    "doesn't seem to be linked",
    "expo go",
    "nativekakaocore",
    "nativekakaouser",
    "rnckakaocore",
    "rnckakaouser",
    "turbomoduleregistry",
  ].some((keyword) => message.includes(keyword));
}

async function initializeKakaoSdk(nativeAppKey: string) {
  if (initializedAppKey === nativeAppKey) {
    return;
  }

  if (!initializationPromise) {
    initializationPromise = import("@react-native-kakao/core")
      .then(({ initializeKakaoSDK }) => initializeKakaoSDK(nativeAppKey))
      .then(() => {
        initializedAppKey = nativeAppKey;
      })
      .finally(() => {
        initializationPromise = null;
      });
  }

  await initializationPromise;
}

export async function requestKakaoAccessToken() {
  const nativeAppKey = getNativeAppKey();

  if (Constants.appOwnership === "expo" || Platform.OS === "web") {
    throw new KakaoLoginUnavailableError();
  }

  try {
    await initializeKakaoSdk(nativeAppKey);

    // Expo Go에는 이 네이티브 모듈이 없으므로 버튼을 누를 때만 불러온다.
    const { login } = await import("@react-native-kakao/user");
    const result = await login();

    if (!result.accessToken.trim()) {
      throw new Error("카카오에서 로그인 토큰을 받지 못했습니다.");
    }

    return result.accessToken;
  } catch (error) {
    if (isNativeModuleUnavailable(error)) {
      throw new KakaoLoginUnavailableError();
    }

    throw error;
  }
}
