import type { LocalRecordOwnerKey } from "@/entities/travel-record";
import { localTravelRecordRepository } from "@/entities/travel-record";
import { deleteDurablePhoto } from "@/shared/lib/storage";

export type PhotoCleanupResult = {
  cleanedCount: number;
  deferred: boolean;
  failedCount: number;
};

export async function flushQueuedPhotoCleanup(
  ownerKey: LocalRecordOwnerKey,
): Promise<PhotoCleanupResult> {
  let localUris: readonly string[];
  try {
    localUris =
      await localTravelRecordRepository.listPendingPhotoCleanup(ownerKey);
  } catch {
    return { cleanedCount: 0, deferred: true, failedCount: 0 };
  }

  const results = await Promise.allSettled(localUris.map(deleteDurablePhoto));
  const cleanedUris = localUris.filter(
    (_localUri, index) => results[index]?.status === "fulfilled",
  );

  try {
    await localTravelRecordRepository.completePhotoCleanup(
      ownerKey,
      cleanedUris,
    );
  } catch {
    return {
      cleanedCount: cleanedUris.length,
      deferred: true,
      failedCount: localUris.length - cleanedUris.length,
    };
  }

  return {
    cleanedCount: cleanedUris.length,
    deferred: false,
    failedCount: localUris.length - cleanedUris.length,
  };
}
