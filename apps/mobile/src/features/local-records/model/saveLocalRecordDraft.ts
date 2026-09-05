import type { TouristPlaceCandidate } from "@/entities/tourist-place";
import type {
  CreateLocalTravelRecordInput,
  DiaryStyle,
  LocalRecordOwnerKey,
  LocalTravelRecord,
  LocalTravelRecordRepository,
  RecordTheme,
} from "@/entities/travel-record";

export type SaveLocalRecordDraftPhotoInput = {
  assetId?: string | null;
  date: string;
  dimensions: {
    height: number;
    width: number;
  };
  place: TouristPlaceCandidate;
  sourceUri: string;
};

export type SaveLocalRecordDraftInput = {
  notesByDate?: Readonly<Record<string, string | null | undefined>>;
  ownerKey: LocalRecordOwnerKey;
  photos: readonly SaveLocalRecordDraftPhotoInput[];
  style?: DiaryStyle | null;
  tags?: readonly string[];
  theme?: RecordTheme | null;
  title: string;
};

export type SaveLocalRecordDraftDependencies = {
  cleanupStagedPhotos: (ownerKey: LocalRecordOwnerKey) => Promise<unknown>;
  copyPhoto: (
    sourceUri: string,
    photoId: string,
    dimensions: { height: number; width: number },
  ) => Promise<unknown>;
  createRecordId?: () => string;
  repository: Pick<
    LocalTravelRecordRepository,
    "createRecord" | "stagePhotoCleanup"
  >;
  targetPhotoUri: (photoId: string) => string;
};

function createLocalRecordId() {
  return `record-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

/**
 * 선택 사진을 앱 전용 파일로 먼저 옮긴 뒤, 파일 참조와 방문 정보를 한 번에 저장한다.
 * 복사 대상은 사전에 정리 큐에 등록되며 SQLite 트랜잭션이 성공할 때만 큐에서 해제된다.
 */
export async function saveLocalRecordDraft(
  input: SaveLocalRecordDraftInput,
  dependencies: SaveLocalRecordDraftDependencies,
): Promise<LocalTravelRecord> {
  if (input.photos.length === 0) {
    throw new Error("저장할 사진이 없습니다.");
  }

  const recordId = dependencies.createRecordId?.() ?? createLocalRecordId();
  const plannedPhotos = input.photos.map((photo, photoIndex) => {
    const localId = `${recordId}-photo-${photoIndex + 1}`;

    return {
      ...photo,
      localId,
      localUri: dependencies.targetPhotoUri(localId),
    };
  });

  try {
    await dependencies.repository.stagePhotoCleanup(
      input.ownerKey,
      plannedPhotos.map((photo) => photo.localUri),
    );

    const copiedPhotos: typeof plannedPhotos = [];
    for (const photo of plannedPhotos) {
      await dependencies.copyPhoto(
        photo.sourceUri,
        photo.localId,
        photo.dimensions,
      );
      copiedPhotos.push(photo);
    }

    const photosByDate = new Map<string, typeof copiedPhotos>();
    copiedPhotos.forEach((photo) => {
      photosByDate.set(photo.date, [
        ...(photosByDate.get(photo.date) ?? []),
        photo,
      ]);
    });

    const days: CreateLocalTravelRecordInput["days"] = [
      ...photosByDate.entries(),
    ]
      .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
      .map(([date, datePhotos], dayIndex) => {
        const dayId = `${recordId}-day-${dayIndex + 1}`;

        return {
          date,
          id: dayId,
          note: input.notesByDate?.[date] ?? null,
          photos: datePhotos.map((photo) => ({
            id: photo.localId,
            localAssetId: photo.assetId ?? null,
            localUri: photo.localUri,
          })),
          visits: datePhotos.map((photo, photoIndex) => ({
            areaCode: photo.place.areaCode,
            categoryCode: photo.place.categoryCode ?? null,
            contentId: photo.place.contentId,
            id: `${dayId}-visit-${photoIndex + 1}`,
            matchConfidence: photo.place.confidence,
            matchMethod: photo.place.matchMethod,
            photoId: photo.localId,
            sigunguCode: photo.place.sigunguCode ?? null,
            visitedAt: `${date}T12:00:00.000Z`,
          })),
        };
      });

    return await dependencies.repository.createRecord({
      days,
      id: recordId,
      ownerKey: input.ownerKey,
      style: input.style,
      tags: input.tags,
      theme: input.theme,
      title: input.title,
    });
  } catch (error) {
    try {
      await dependencies.cleanupStagedPhotos(input.ownerKey);
    } catch {
      // 정리 큐는 남아 있으므로 다음 앱 시작/삭제 작업에서 다시 처리할 수 있다.
    }
    throw error;
  }
}
