import type { AccountWithdrawalOwnerKey } from "./withdrawAccount";

export type PendingWithdrawalCleanupRecoveryResult = {
  attemptedCount: number;
  failedOwnerKeys: readonly AccountWithdrawalOwnerKey[];
  recoveredCount: number;
};

export type PendingWithdrawalCleanupRecoveryDependencies = {
  clearLocalData: (ownerKey: AccountWithdrawalOwnerKey) => Promise<void>;
  completePendingCleanup: (
    ownerKey: AccountWithdrawalOwnerKey,
  ) => Promise<void>;
  readPendingOwnerKeys: () => Promise<readonly AccountWithdrawalOwnerKey[]>;
};

export async function recoverPendingWithdrawalCleanup(
  dependencies: PendingWithdrawalCleanupRecoveryDependencies,
): Promise<PendingWithdrawalCleanupRecoveryResult> {
  const ownerKeys = await dependencies.readPendingOwnerKeys();
  const failedOwnerKeys: AccountWithdrawalOwnerKey[] = [];
  let recoveredCount = 0;

  // SecureStore의 marker에 명시된 탈퇴 계정만 순서대로 정리한다.
  for (const ownerKey of ownerKeys) {
    try {
      await dependencies.clearLocalData(ownerKey);
      await dependencies.completePendingCleanup(ownerKey);
      recoveredCount += 1;
    } catch {
      failedOwnerKeys.push(ownerKey);
    }
  }

  return {
    attemptedCount: ownerKeys.length,
    failedOwnerKeys,
    recoveredCount,
  };
}
