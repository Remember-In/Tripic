import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  completePhotoCleanup: vi.fn(),
  deleteDurablePhoto: vi.fn(),
  listPendingPhotoCleanup: vi.fn(),
  listPhotoCleanupOwnerKeys: vi.fn(),
}));

vi.mock("@/entities/travel-record", () => ({
  localTravelRecordRepository: {
    completePhotoCleanup: mocks.completePhotoCleanup,
    listPendingPhotoCleanup: mocks.listPendingPhotoCleanup,
    listPhotoCleanupOwnerKeys: mocks.listPhotoCleanupOwnerKeys,
  },
}));

vi.mock("@/shared/lib/storage", () => ({
  deleteDurablePhoto: mocks.deleteDurablePhoto,
}));

import {
  flushAllQueuedPhotoCleanup,
  flushQueuedPhotoCleanup,
} from "./flushQueuedPhotoCleanup";

describe("photo cleanup queue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.completePhotoCleanup.mockResolvedValue(undefined);
    mocks.deleteDurablePhoto.mockResolvedValue(undefined);
  });

  it("removes only files that were deleted successfully", async () => {
    mocks.listPendingPhotoCleanup.mockResolvedValue([
      "file:///deleted.jpg",
      "file:///retry.jpg",
    ]);
    mocks.deleteDurablePhoto.mockImplementation(async (localUri: string) => {
      if (localUri.endsWith("retry.jpg")) {
        throw new Error("temporarily unavailable");
      }
    });

    await expect(flushQueuedPhotoCleanup("guest")).resolves.toEqual({
      cleanedCount: 1,
      deferred: false,
      failedCount: 1,
    });
    expect(mocks.completePhotoCleanup).toHaveBeenCalledWith("guest", [
      "file:///deleted.jpg",
    ]);
  });

  it("retries queued files for every owner without touching their records", async () => {
    mocks.listPhotoCleanupOwnerKeys.mockResolvedValue(["guest", "user:user-1"]);
    mocks.listPendingPhotoCleanup.mockImplementation(
      async (ownerKey: string) =>
        ownerKey === "guest" ? ["file:///guest.jpg"] : ["file:///user.jpg"],
    );

    await expect(flushAllQueuedPhotoCleanup()).resolves.toEqual({
      cleanedCount: 2,
      deferred: false,
      failedCount: 0,
      ownerCount: 2,
    });
    expect(mocks.listPendingPhotoCleanup).toHaveBeenCalledWith("guest");
    expect(mocks.listPendingPhotoCleanup).toHaveBeenCalledWith("user:user-1");
    expect(mocks.completePhotoCleanup).toHaveBeenCalledTimes(2);
  });

  it("defers the sweep when the owner queue cannot be read", async () => {
    mocks.listPhotoCleanupOwnerKeys.mockRejectedValue(
      new Error("database unavailable"),
    );

    await expect(flushAllQueuedPhotoCleanup()).resolves.toEqual({
      cleanedCount: 0,
      deferred: true,
      failedCount: 0,
      ownerCount: 0,
    });
    expect(mocks.deleteDurablePhoto).not.toHaveBeenCalled();
  });
});
