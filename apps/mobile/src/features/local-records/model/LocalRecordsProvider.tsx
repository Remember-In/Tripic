import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, type PropsWithChildren, useContext } from "react";

import {
  localTravelRecordRepository,
  type LocalRecordOwnerKey,
  type LocalRegionProgressScope,
  type UpdateLocalTravelRecordInput,
} from "@/entities/travel-record";
import { createDurablePhotoCopy, durablePhotoUri } from "@/shared/lib/storage";

import { flushQueuedPhotoCleanup } from "../lib/flushQueuedPhotoCleanup";
import {
  saveLocalRecordDraft,
  type SaveLocalRecordDraftInput,
} from "./saveLocalRecordDraft";

type LocalRecordsProviderProps = PropsWithChildren<{
  ownerKey: LocalRecordOwnerKey | null;
}>;

const LocalRecordOwnerContext = createContext<LocalRecordOwnerKey | null>(null);

export const localRecordQueryKeys = {
  all: (ownerKey: LocalRecordOwnerKey) => ["local-records", ownerKey] as const,
  detail: (ownerKey: LocalRecordOwnerKey, recordId: string) =>
    ["local-records", ownerKey, "detail", recordId] as const,
  list: (ownerKey: LocalRecordOwnerKey) =>
    ["local-records", ownerKey, "list"] as const,
  progress: (ownerKey: LocalRecordOwnerKey, scope: LocalRegionProgressScope) =>
    ["local-records", ownerKey, "progress", scope] as const,
  stats: (ownerKey: LocalRecordOwnerKey) =>
    ["local-records", ownerKey, "stats"] as const,
};

function requireOwnerKey(ownerKey: LocalRecordOwnerKey | null) {
  if (!ownerKey) {
    throw new Error("로컬 기록 사용자 확인이 끝나지 않았습니다.");
  }
  return ownerKey;
}

export function LocalRecordsProvider({
  children,
  ownerKey,
}: LocalRecordsProviderProps) {
  return (
    <LocalRecordOwnerContext.Provider value={ownerKey}>
      {children}
    </LocalRecordOwnerContext.Provider>
  );
}

export function useLocalRecordOwnerKey() {
  return useContext(LocalRecordOwnerContext);
}

export function useLocalRecordsQuery() {
  const ownerKey = useLocalRecordOwnerKey();
  return useQuery({
    enabled: Boolean(ownerKey),
    queryFn: () =>
      localTravelRecordRepository.listRecords(requireOwnerKey(ownerKey)),
    queryKey: ownerKey
      ? localRecordQueryKeys.list(ownerKey)
      : (["local-records", "pending", "list"] as const),
  });
}

export function useLocalRecordQuery(recordId: string | undefined) {
  const ownerKey = useLocalRecordOwnerKey();
  return useQuery({
    enabled: Boolean(ownerKey && recordId),
    queryFn: () =>
      localTravelRecordRepository.getRecord(
        requireOwnerKey(ownerKey),
        recordId ?? "",
      ),
    queryKey:
      ownerKey && recordId
        ? localRecordQueryKeys.detail(ownerKey, recordId)
        : (["local-records", "pending", "detail", recordId] as const),
  });
}

export function useLocalRegionProgressQuery(
  scope: LocalRegionProgressScope = "area",
) {
  const ownerKey = useLocalRecordOwnerKey();
  return useQuery({
    enabled: Boolean(ownerKey),
    queryFn: () =>
      localTravelRecordRepository.getRegionProgress(
        requireOwnerKey(ownerKey),
        scope,
      ),
    queryKey: ownerKey
      ? localRecordQueryKeys.progress(ownerKey, scope)
      : (["local-records", "pending", "progress", scope] as const),
  });
}

export function useLocalRecordStatsQuery() {
  const ownerKey = useLocalRecordOwnerKey();
  return useQuery({
    enabled: Boolean(ownerKey),
    queryFn: () =>
      localTravelRecordRepository.getStats(requireOwnerKey(ownerKey)),
    queryKey: ownerKey
      ? localRecordQueryKeys.stats(ownerKey)
      : (["local-records", "pending", "stats"] as const),
  });
}

function useInvalidateLocalRecords() {
  const queryClient = useQueryClient();

  return async (ownerKey: LocalRecordOwnerKey) => {
    await queryClient.invalidateQueries({
      queryKey: localRecordQueryKeys.all(ownerKey),
    });
  };
}

export function useSaveLocalRecordDraftMutation() {
  const invalidate = useInvalidateLocalRecords();
  return useMutation({
    gcTime: 0,
    mutationFn: (input: SaveLocalRecordDraftInput) =>
      saveLocalRecordDraft(input, {
        cleanupStagedPhotos: flushQueuedPhotoCleanup,
        copyPhoto: createDurablePhotoCopy,
        repository: localTravelRecordRepository,
        targetPhotoUri: durablePhotoUri,
      }),
    onSuccess: (_record, input) => invalidate(input.ownerKey),
  });
}

export function useUpdateLocalRecordMutation() {
  const invalidate = useInvalidateLocalRecords();
  return useMutation({
    gcTime: 0,
    mutationFn: ({
      input,
      ownerKey,
    }: {
      input: UpdateLocalTravelRecordInput;
      ownerKey: LocalRecordOwnerKey;
    }) =>
      localTravelRecordRepository
        .updateRecord(ownerKey, input)
        .then(async (record) => ({
          photoCleanup: await flushQueuedPhotoCleanup(ownerKey),
          record,
        })),
    onSuccess: (_record, variables) => invalidate(variables.ownerKey),
  });
}

export function useDeleteLocalRecordMutation() {
  const invalidate = useInvalidateLocalRecords();
  return useMutation({
    gcTime: 0,
    mutationFn: ({
      ownerKey,
      recordId,
    }: {
      ownerKey: LocalRecordOwnerKey;
      recordId: string;
    }) =>
      localTravelRecordRepository
        .deleteRecord(ownerKey, recordId)
        .then(async (wasDeleted) => ({
          photoCleanup: await flushQueuedPhotoCleanup(ownerKey),
          wasDeleted,
        })),
    onSuccess: (_wasDeleted, variables) => invalidate(variables.ownerKey),
  });
}

export function useClearLocalRecordsMutation() {
  const invalidate = useInvalidateLocalRecords();
  return useMutation({
    gcTime: 0,
    mutationFn: ({ ownerKey }: { ownerKey: LocalRecordOwnerKey }) =>
      localTravelRecordRepository
        .clearRecords(ownerKey)
        .then(async (deletedCount) => ({
          deletedCount,
          photoCleanup: await flushQueuedPhotoCleanup(ownerKey),
        })),
    onSuccess: (_deletedCount, variables) => invalidate(variables.ownerKey),
  });
}
