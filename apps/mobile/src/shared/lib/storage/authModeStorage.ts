import * as SecureStore from "expo-secure-store";

const guestModeKey = "tripic.auth.guest-mode.v1";

const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export async function readGuestMode() {
  return (await SecureStore.getItemAsync(guestModeKey, secureStoreOptions)) === "true";
}

export function writeGuestMode() {
  return SecureStore.setItemAsync(guestModeKey, "true", secureStoreOptions);
}

export function clearGuestMode() {
  return SecureStore.deleteItemAsync(guestModeKey, secureStoreOptions);
}
