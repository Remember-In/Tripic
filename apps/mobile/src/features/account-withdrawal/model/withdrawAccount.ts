export type AccountWithdrawalOwnerKey = `user:${string}`;

export type LocalDataCleanupStatus =
  "complete" | "failed" | "photo-cleanup-pending" | "retry-scheduled";

export type WithdrawAccountResult = {
  localDataCleanup: LocalDataCleanupStatus;
  localSessionCleaned: boolean;
};

export type WithdrawAccountDependencies = {
  clearLocalData: () => Promise<LocalDataCleanupStatus>;
  clearLocalSession: () => Promise<void>;
  completePendingCleanup: (
    ownerKey: AccountWithdrawalOwnerKey,
  ) => Promise<void>;
  deleteRemoteAccount: () => Promise<void>;
  markPendingCleanup: (ownerKey: AccountWithdrawalOwnerKey) => Promise<void>;
  ownerKey: AccountWithdrawalOwnerKey;
};

export async function withdrawAccount({
  clearLocalData,
  clearLocalSession,
  completePendingCleanup,
  deleteRemoteAccount,
  markPendingCleanup,
  ownerKey,
}: WithdrawAccountDependencies): Promise<WithdrawAccountResult> {
  // 서버 탈퇴가 확인되기 전에는 기기의 세션과 기록을 보존한다.
  await deleteRemoteAccount();

  let isRecoveryScheduled = false;
  try {
    await markPendingCleanup(ownerKey);
    isRecoveryScheduled = true;
  } catch {
    // marker 저장에 실패해도 현재 실행에서 로컬 정리와 세션 종료를 계속 시도한다.
  }

  let localDataCleanup: LocalDataCleanupStatus = isRecoveryScheduled
    ? "retry-scheduled"
    : "failed";
  let localSessionCleaned = false;

  try {
    const cleanupResult = await clearLocalData();
    const didClearLocalRecords =
      cleanupResult === "complete" || cleanupResult === "photo-cleanup-pending";

    if (!didClearLocalRecords) {
      localDataCleanup = isRecoveryScheduled ? "retry-scheduled" : "failed";
    } else {
      localDataCleanup = cleanupResult;

      if (isRecoveryScheduled) {
        try {
          await completePendingCleanup(ownerKey);
        } catch {
          // 삭제는 끝났지만 marker 제거가 실패하면 다음 실행에서 멱등하게 재정리한다.
          localDataCleanup = "retry-scheduled";
        }
      }
    }
  } catch {
    localDataCleanup = isRecoveryScheduled ? "retry-scheduled" : "failed";
  }

  // 로컬 기록 정리가 실패해도 삭제된 계정의 세션은 반드시 끝낸다.
  try {
    await clearLocalSession();
    localSessionCleaned = true;
  } catch {
    localSessionCleaned = false;
  }

  return { localDataCleanup, localSessionCleaned };
}
