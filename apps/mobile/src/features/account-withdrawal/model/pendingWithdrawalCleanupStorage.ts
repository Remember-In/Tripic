import * as SecureStore from "expo-secure-store";

import type { AccountWithdrawalOwnerKey } from "./withdrawAccount";

const pendingWithdrawalCleanupKey =
  "tripic.pending-account-withdrawal-cleanup.v1";

const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

let storageOperationTail: Promise<void> = Promise.resolve();

function isUserOwnerKey(value: unknown): value is `user:${string}` {
  return (
    typeof value === "string" &&
    value.startsWith("user:") &&
    value.slice("user:".length).trim().length > 0
  );
}

function runSerialized<T>(operation: () => Promise<T>): Promise<T> {
  const pending = storageOperationTail.then(operation, operation);
  storageOperationTail = pending.then(
    () => undefined,
    () => undefined,
  );
  return pending;
}

async function readStoredOwnerKeys(): Promise<
  readonly AccountWithdrawalOwnerKey[]
> {
  const storedValue = await SecureStore.getItemAsync(
    pendingWithdrawalCleanupKey,
    secureStoreOptions,
  );

  if (!storedValue) {
    return [];
  }

  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(storedValue);
  } catch {
    throw new Error("탈퇴 후 기기 데이터 정리 정보를 읽을 수 없습니다.");
  }

  if (!Array.isArray(parsedValue) || !parsedValue.every(isUserOwnerKey)) {
    throw new Error("탈퇴 후 기기 데이터 정리 정보가 올바르지 않습니다.");
  }

  return [...new Set(parsedValue)];
}

export function readPendingWithdrawalCleanupOwnerKeys() {
  return runSerialized(readStoredOwnerKeys);
}

export function markPendingWithdrawalCleanup(
  ownerKey: AccountWithdrawalOwnerKey,
): Promise<void> {
  if (!isUserOwnerKey(ownerKey)) {
    return Promise.reject(
      new Error(
        "회원 탈퇴 정리는 로그인한 사용자 기록에만 예약할 수 있습니다.",
      ),
    );
  }

  return runSerialized(async () => {
    const ownerKeys = await readStoredOwnerKeys();

    if (ownerKeys.includes(ownerKey)) {
      return;
    }

    await SecureStore.setItemAsync(
      pendingWithdrawalCleanupKey,
      JSON.stringify([...ownerKeys, ownerKey]),
      secureStoreOptions,
    );
  });
}

export function completePendingWithdrawalCleanup(
  ownerKey: AccountWithdrawalOwnerKey,
): Promise<void> {
  if (!isUserOwnerKey(ownerKey)) {
    return Promise.reject(
      new Error(
        "회원 탈퇴 정리는 로그인한 사용자 기록에만 적용할 수 있습니다.",
      ),
    );
  }

  return runSerialized(async () => {
    const ownerKeys = await readStoredOwnerKeys();
    const nextOwnerKeys = ownerKeys.filter(
      (candidate) => candidate !== ownerKey,
    );

    if (nextOwnerKeys.length === ownerKeys.length) {
      return;
    }

    if (nextOwnerKeys.length === 0) {
      await SecureStore.deleteItemAsync(
        pendingWithdrawalCleanupKey,
        secureStoreOptions,
      );
      return;
    }

    await SecureStore.setItemAsync(
      pendingWithdrawalCleanupKey,
      JSON.stringify(nextOwnerKeys),
      secureStoreOptions,
    );
  });
}
