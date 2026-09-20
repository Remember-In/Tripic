import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from "@nestjs/common";
import type {
  CreateRecordInput,
  RecordDetail,
  RecordPhoto,
  RecordSummary,
  UpdateRecordInput,
  UpsertEntryInput,
} from "@tripic/shared";
import {
  IMAGE_INSPECTOR,
  ImageRejected,
  type ImageInspector,
  type InspectedImage,
} from "@/records/ports/image-inspector.port";
import {
  RECORDS_REPOSITORY,
  type RecordPatch,
  type RecordsRepository,
  type StoredEntry,
  type StoredPhoto,
} from "@/records/ports/records-repository.port";

/** 할당량 (docs/11 §3.1) — 값 조정이 필요해지면 app-config 로 원격화한다 */
export const MAX_PHOTO_BYTES = 1024 * 1024;
export const MAX_PHOTOS_PER_RECORD = 20;
export const MAX_TOTAL_BYTES_PER_USER = 100 * 1024 * 1024;

/**
 * 여행 기록 콘텐츠 유스케이스 (docs/11-records-api-design.md).
 *
 * 소유권 정책이 이 서비스의 핵심이다: 타인의 기록은 403 이 아니라 **404** 로
 * 존재 자체를 숨긴다. 실제 필터링은 port 계약(userId)에 맡기고, 여기서는
 * "없음" 을 404 로 번역한다.
 */
@Injectable()
export class RecordsService {
  constructor(
    @Inject(RECORDS_REPOSITORY) private readonly records: RecordsRepository,
    @Inject(IMAGE_INSPECTOR) private readonly images: ImageInspector,
  ) {}

  create(userId: string, input: CreateRecordInput): Promise<RecordSummary> {
    return this.records.create({
      userId,
      title: input.title,
      theme: input.theme ?? null,
      style: input.style ?? null,
      hashtags: input.hashtags,
    });
  }

  list(userId: string): Promise<RecordSummary[]> {
    return this.records.listByUser(userId);
  }

  async findOne(userId: string, recordId: string): Promise<RecordDetail> {
    const detail = await this.records.findDetail(userId, recordId);
    if (!detail) throw this.notFound();
    return detail;
  }

  async update(
    userId: string,
    recordId: string,
    input: UpdateRecordInput,
  ): Promise<RecordSummary> {
    const updated = await this.records.update(
      userId,
      recordId,
      this.toPatch(input),
    );
    if (!updated) throw this.notFound();
    return updated;
  }

  async remove(userId: string, recordId: string): Promise<void> {
    const deleted = await this.records.delete(userId, recordId);
    if (!deleted) throw this.notFound();
  }

  /** 설정의 "전체 기록 초기화" — 지울 게 없어도 성공으로 본다 (멱등) */
  removeAll(userId: string): Promise<void> {
    return this.records.deleteAllByUser(userId);
  }

  async upsertEntry(
    userId: string,
    recordId: string,
    date: string,
    input: UpsertEntryInput,
  ): Promise<StoredEntry> {
    const entry = await this.records.upsertEntry(userId, recordId, date, input);
    if (!entry) throw this.notFound();
    return entry;
  }

  async removeEntry(
    userId: string,
    recordId: string,
    date: string,
  ): Promise<void> {
    const deleted = await this.records.deleteEntry(userId, recordId, date);
    if (!deleted) throw this.notFound();
  }

  /**
   * 사진 업로드 — 검증을 통과한 사본만 저장한다 (docs/11 §3.1).
   *
   * 순서가 중요하다: 할당량을 먼저 보고(413), 그다음 이미지 자체를 검증한다(400).
   * 한도를 넘은 요청에 디코딩 비용을 쓰지 않기 위해서다.
   */
  async addPhoto(
    userId: string,
    recordId: string,
    date: string,
    data: Buffer<ArrayBuffer>,
  ): Promise<RecordPhoto> {
    const usage = await this.records.photoUsage(userId, recordId);
    if (!usage) throw this.notFound();

    if (data.byteLength > MAX_PHOTO_BYTES) {
      throw new PayloadTooLargeException("photo exceeds the per-file limit");
    }
    if (usage.recordPhotoCount >= MAX_PHOTOS_PER_RECORD) {
      throw new PayloadTooLargeException("record photo limit reached");
    }
    if (usage.userTotalBytes + data.byteLength > MAX_TOTAL_BYTES_PER_USER) {
      throw new PayloadTooLargeException("storage quota reached");
    }

    const inspected = await this.inspect(data);
    const photoId = await this.records.addPhoto(userId, recordId, date, {
      data,
      mimeType: inspected.mimeType,
      size: data.byteLength,
    });
    if (!photoId) throw this.notFound();

    return { id: photoId, url: this.photoUrl(recordId, date, photoId) };
  }

  async findPhoto(
    userId: string,
    recordId: string,
    date: string,
    photoId: string,
  ): Promise<StoredPhoto> {
    const photo = await this.records.findPhoto(userId, recordId, date, photoId);
    if (!photo) throw this.notFound();
    return photo;
  }

  async removePhoto(
    userId: string,
    recordId: string,
    date: string,
    photoId: string,
  ): Promise<void> {
    const deleted = await this.records.deletePhoto(
      userId,
      recordId,
      date,
      photoId,
    );
    if (!deleted) throw this.notFound();
  }

  /** 검증 실패 사유를 400 메시지로 옮긴다 — 어떤 검사에 걸렸는지 앱이 알 수 있게 한다 */
  private async inspect(data: Buffer<ArrayBuffer>): Promise<InspectedImage> {
    try {
      return await this.images.inspect(data);
    } catch (error) {
      if (error instanceof ImageRejected) {
        throw new BadRequestException(`photo rejected: ${error.reason}`);
      }
      throw error;
    }
  }

  private photoUrl(recordId: string, date: string, photoId: string): string {
    return `/records/${recordId}/days/${date}/photos/${photoId}`;
  }

  /**
   * zod 입력을 port 계약으로 옮긴다.
   * `theme`/`style` 은 undefined(그대로 두기)와 null(해제)을 구분해야 하므로
   * 키가 실제로 들어온 경우에만 옮긴다.
   */
  private toPatch(input: UpdateRecordInput): RecordPatch {
    const patch: RecordPatch = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.hashtags !== undefined) patch.hashtags = input.hashtags;
    if ("theme" in input) patch.theme = input.theme ?? null;
    if ("style" in input) patch.style = input.style ?? null;
    return patch;
  }

  private notFound(): NotFoundException {
    return new NotFoundException("record not found");
  }
}
