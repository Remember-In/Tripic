import * as SecureStore from "expo-secure-store";

const LAST_LOCAL_USER_ID_KEY = "tripic.last-local-user-id.v1";

export async function readLastLocalUserId() {
  const userId = (
    await SecureStore.getItemAsync(LAST_LOCAL_USER_ID_KEY)
  )?.trim();
  return userId || null;
}

export async function writeLastLocalUserId(userId: string) {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    throw new Error("로컬 기록 사용자 ID는 비어 있을 수 없습니다.");
  }

  await SecureStore.setItemAsync(LAST_LOCAL_USER_ID_KEY, normalizedUserId);
}

export async function clearLastLocalUserId() {
  await SecureStore.deleteItemAsync(LAST_LOCAL_USER_ID_KEY);
}
