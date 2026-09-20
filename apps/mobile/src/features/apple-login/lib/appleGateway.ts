import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";

export class AppleLoginCancelledError extends Error {
  constructor() {
    super("Apple 로그인이 취소되었습니다.");
    this.name = "AppleLoginCancelledError";
  }
}

export class AppleLoginUnavailableError extends Error {
  constructor() {
    super("이 기기에서는 Apple 로그인을 사용할 수 없어요.");
    this.name = "AppleLoginUnavailableError";
  }
}

function isRequestCancelled(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ERR_REQUEST_CANCELED"
  );
}

export async function isAppleLoginAvailable() {
  return Platform.OS === "ios" && AppleAuthentication.isAvailableAsync();
}

export async function requestAppleCredential() {
  if (!(await isAppleLoginAvailable())) {
    throw new AppleLoginUnavailableError();
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [],
    });
    const identityToken = credential.identityToken?.trim();
    const authorizationCode = credential.authorizationCode?.trim();

    if (!identityToken || !authorizationCode) {
      throw new Error("Apple에서 로그인 인증 정보를 받지 못했어요.");
    }

    return { authorizationCode, identityToken };
  } catch (error) {
    if (isRequestCancelled(error)) {
      throw new AppleLoginCancelledError();
    }

    throw error;
  }
}
