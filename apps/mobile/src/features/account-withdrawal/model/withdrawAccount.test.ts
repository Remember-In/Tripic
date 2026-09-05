import { describe, expect, it, vi } from "vitest";

import { recoverPendingWithdrawalCleanup } from "./recoverPendingWithdrawalCleanup";
import {
  withdrawAccount,
  type AccountWithdrawalOwnerKey,
} from "./withdrawAccount";

const ownerKey = "user:user-1" as const;

describe("withdrawAccount", () => {
  it("orders remote deletion, durable marker, local cleanup, and session cleanup", async () => {
    const callOrder: string[] = [];
    const result = await withdrawAccount({
      clearLocalData: vi.fn(async () => {
        callOrder.push("local-data");
        return "complete" as const;
      }),
      clearLocalSession: vi.fn(async () => {
        callOrder.push("local-session");
      }),
      completePendingCleanup: vi.fn(async () => {
        callOrder.push("complete-marker");
      }),
      deleteRemoteAccount: vi.fn(async () => {
        callOrder.push("remote-account");
      }),
      markPendingCleanup: vi.fn(async () => {
        callOrder.push("mark-cleanup");
      }),
      ownerKey,
    });

    expect(callOrder).toEqual([
      "remote-account",
      "mark-cleanup",
      "local-data",
      "complete-marker",
      "local-session",
    ]);
    expect(result).toEqual({
      localDataCleanup: "complete",
      localSessionCleaned: true,
    });
  });

  it("does not change local state when remote deletion is not confirmed", async () => {
    const serverError = new Error("server error");
    const clearLocalData = vi.fn(async () => "complete" as const);
    const clearLocalSession = vi.fn(async () => undefined);
    const markPendingCleanup = vi.fn(async () => undefined);

    await expect(
      withdrawAccount({
        clearLocalData,
        clearLocalSession,
        completePendingCleanup: vi.fn(async () => undefined),
        deleteRemoteAccount: vi.fn(async () => {
          throw serverError;
        }),
        markPendingCleanup,
        ownerKey,
      }),
    ).rejects.toBe(serverError);

    expect(markPendingCleanup).not.toHaveBeenCalled();
    expect(clearLocalData).not.toHaveBeenCalled();
    expect(clearLocalSession).not.toHaveBeenCalled();
  });

  it("recovers marked local records on the next launch after a database failure", async () => {
    const pendingOwners = new Set<AccountWithdrawalOwnerKey>();
    const clearLocalSession = vi.fn(async () => undefined);

    const withdrawalResult = await withdrawAccount({
      clearLocalData: vi.fn(async () => {
        throw new Error("database error");
      }),
      clearLocalSession,
      completePendingCleanup: vi.fn(async (candidate) => {
        pendingOwners.delete(candidate);
      }),
      deleteRemoteAccount: vi.fn(async () => undefined),
      markPendingCleanup: vi.fn(async (candidate) => {
        pendingOwners.add(candidate);
      }),
      ownerKey,
    });

    expect(withdrawalResult).toEqual({
      localDataCleanup: "retry-scheduled",
      localSessionCleaned: true,
    });
    expect(clearLocalSession).toHaveBeenCalledOnce();
    expect(pendingOwners).toEqual(new Set([ownerKey]));

    const recoveredOwners: AccountWithdrawalOwnerKey[] = [];
    const recoveryResult = await recoverPendingWithdrawalCleanup({
      clearLocalData: vi.fn(async (candidate) => {
        recoveredOwners.push(candidate);
      }),
      completePendingCleanup: vi.fn(async (candidate) => {
        pendingOwners.delete(candidate);
      }),
      readPendingOwnerKeys: vi.fn(async () => [...pendingOwners]),
    });

    expect(recoveredOwners).toEqual([ownerKey]);
    expect(pendingOwners.size).toBe(0);
    expect(recoveryResult).toEqual({
      attemptedCount: 1,
      failedOwnerKeys: [],
      recoveredCount: 1,
    });
  });

  it("still attempts local data and session cleanup when marker storage fails", async () => {
    const clearLocalSession = vi.fn(async () => undefined);
    const completePendingCleanup = vi.fn(async () => undefined);
    const result = await withdrawAccount({
      clearLocalData: vi.fn(async () => {
        throw new Error("database error");
      }),
      clearLocalSession,
      completePendingCleanup,
      deleteRemoteAccount: vi.fn(async () => undefined),
      markPendingCleanup: vi.fn(async () => {
        throw new Error("secure storage error");
      }),
      ownerKey,
    });

    expect(completePendingCleanup).not.toHaveBeenCalled();
    expect(clearLocalSession).toHaveBeenCalledOnce();
    expect(result).toEqual({
      localDataCleanup: "failed",
      localSessionCleaned: true,
    });
  });

  it("keeps the marker when local cleanup resolves without confirming deletion", async () => {
    const completePendingCleanup = vi.fn(async () => undefined);
    const result = await withdrawAccount({
      clearLocalData: vi.fn(async () => "failed" as const),
      clearLocalSession: vi.fn(async () => undefined),
      completePendingCleanup,
      deleteRemoteAccount: vi.fn(async () => undefined),
      markPendingCleanup: vi.fn(async () => undefined),
      ownerKey,
    });

    expect(completePendingCleanup).not.toHaveBeenCalled();
    expect(result).toEqual({
      localDataCleanup: "retry-scheduled",
      localSessionCleaned: true,
    });
  });

  it("keeps a marker when removing it fails and reports session cleanup", async () => {
    const result = await withdrawAccount({
      clearLocalData: vi.fn(async () => "complete" as const),
      clearLocalSession: vi.fn(async () => {
        throw new Error("secure storage error");
      }),
      completePendingCleanup: vi.fn(async () => {
        throw new Error("marker delete error");
      }),
      deleteRemoteAccount: vi.fn(async () => undefined),
      markPendingCleanup: vi.fn(async () => undefined),
      ownerKey,
    });

    expect(result).toEqual({
      localDataCleanup: "retry-scheduled",
      localSessionCleaned: false,
    });
  });
});

describe("recoverPendingWithdrawalCleanup", () => {
  it("keeps only failed marked owners for a later retry", async () => {
    const secondOwner = "user:user-2" as const;
    const completedOwners: AccountWithdrawalOwnerKey[] = [];
    const clearLocalData = vi.fn(
      async (candidate: AccountWithdrawalOwnerKey) => {
        if (candidate === secondOwner) {
          throw new Error("database error");
        }
      },
    );

    const result = await recoverPendingWithdrawalCleanup({
      clearLocalData,
      completePendingCleanup: vi.fn(async (candidate) => {
        completedOwners.push(candidate);
      }),
      readPendingOwnerKeys: vi.fn(async () => [ownerKey, secondOwner]),
    });

    expect(clearLocalData).toHaveBeenCalledTimes(2);
    expect(completedOwners).toEqual([ownerKey]);
    expect(result).toEqual({
      attemptedCount: 2,
      failedOwnerKeys: [secondOwner],
      recoveredCount: 1,
    });
  });
});
