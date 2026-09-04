import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  CreateRecordInput,
  RecordDetail,
  RecordSummary,
  UpdateRecordInput,
  UpsertEntryInput,
} from "@tripic/shared";
import {
  RECORDS_REPOSITORY,
  type RecordPatch,
  type RecordsRepository,
  type StoredEntry,
} from "@/records/ports/records-repository.port";

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
