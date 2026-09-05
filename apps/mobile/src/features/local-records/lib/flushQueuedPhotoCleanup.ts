import type { LocalRecordOwnerKey } from "@/entities/travel-record";
import { localTravelRecordRepository } from "@/entities/travel-record";
import { deleteDurablePhoto } from "@/shared/lib/storage";

export type PhotoCleanupResult = {
  cleanedCount: number;
  deferred: boolean;
  failedCount: number;
};

export type PhotoCleanupSweepResult = PhotoCleanupResult & {
  ownerCount: number;
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

/**
 * 계정 전환·로그아웃 뒤에도 남을 수 있는 사진 삭제 작업을 모두 재시도한다.
 *
 * 저장된 정리 큐만 순회하며 각 owner의 여행 기록 자체는 조회하거나 삭제하지 않는다.
 * 실제 삭제 대상도 현재 어떤 로컬 기록에서도 참조하지 않는 파일로 저장소 계층에서
 * 한 번 더 제한한다.
 */
export async function flushAllQueuedPhotoCleanup(): Promise<PhotoCleanupSweepResult> {
  let ownerKeys: readonly LocalRecordOwnerKey[];
  try {
    ownerKeys = await localTravelRecordRepository.listPhotoCleanupOwnerKeys();
  } catch {
    return {
      cleanedCount: 0,
      deferred: true,
      failedCount: 0,
      ownerCount: 0,
    };
  }

  const results = await Promise.all(ownerKeys.map(flushQueuedPhotoCleanup));

  return results.reduce<PhotoCleanupSweepResult>(
    (total, result) => ({
      cleanedCount: total.cleanedCount + result.cleanedCount,
      deferred: total.deferred || result.deferred,
      failedCount: total.failedCount + result.failedCount,
      ownerCount: total.ownerCount + 1,
    }),
    {
      cleanedCount: 0,
      deferred: false,
      failedCount: 0,
      ownerCount: 0,
    },
  );
}
