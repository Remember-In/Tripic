import * as SecureStore from "expo-secure-store";

const refreshTokenKey = "tripic.auth.refresh-token.v1";

const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export function readRefreshToken() {
  return SecureStore.getItemAsync(refreshTokenKey, secureStoreOptions);
}

export function writeRefreshToken(refreshToken: string) {
  return SecureStore.setItemAsync(
    refreshTokenKey,
    refreshToken,
    secureStoreOptions,
  );
}

export function clearRefreshToken() {
  return SecureStore.deleteItemAsync(refreshTokenKey, secureStoreOptions);
}
