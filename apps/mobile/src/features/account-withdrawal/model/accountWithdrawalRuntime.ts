import {
  localTravelRecordRepository,
  type LocalRecordOwnerKey,
} from "@/entities/travel-record";

import {
  completePendingWithdrawalCleanup,
  markPendingWithdrawalCleanup,
  readPendingWithdrawalCleanupOwnerKeys,
} from "./pendingWithdrawalCleanupStorage";
import { recoverPendingWithdrawalCleanup } from "./recoverPendingWithdrawalCleanup";
import {
  withdrawAccount,
  type AccountWithdrawalOwnerKey,
  type LocalDataCleanupStatus,
} from "./withdrawAccount";

type WithdrawAccountOnDeviceInput = {
  clearLocalData: () => Promise<LocalDataCleanupStatus>;
  clearLocalSession: () => Promise<void>;
  deleteRemoteAccount: () => Promise<void>;
  ownerKey: LocalRecordOwnerKey;
};

function isAccountWithdrawalOwnerKey(
  ownerKey: LocalRecordOwnerKey,
): ownerKey is AccountWithdrawalOwnerKey {
  return (
    ownerKey.startsWith("user:") &&
    ownerKey.slice("user:".length).trim().length > 0
  );
}

function requireAccountWithdrawalOwnerKey(
  ownerKey: LocalRecordOwnerKey,
): AccountWithdrawalOwnerKey {
  if (!isAccountWithdrawalOwnerKey(ownerKey)) {
    throw new Error("회원 탈퇴는 로그인한 사용자 기록에만 적용할 수 있습니다.");
  }

  return ownerKey;
}

export function withdrawAccountOnDevice(input: WithdrawAccountOnDeviceInput) {
  return withdrawAccount({
    ...input,
    completePendingCleanup: completePendingWithdrawalCleanup,
    markPendingCleanup: markPendingWithdrawalCleanup,
    ownerKey: requireAccountWithdrawalOwnerKey(input.ownerKey),
  });
}

export function recoverPendingWithdrawalCleanupOnAppStart() {
  return recoverPendingWithdrawalCleanup({
    clearLocalData: async (ownerKey) => {
      await localTravelRecordRepository.clearRecords(ownerKey);
    },
    completePendingCleanup: completePendingWithdrawalCleanup,
    readPendingOwnerKeys: readPendingWithdrawalCleanupOwnerKeys,
  });
}
