import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
} from "@nestjs/common";
import {
  createRecordSchema,
  entryDateSchema,
  updateRecordSchema,
  upsertEntrySchema,
  type CreateRecordInput,
  type RecordDetail,
  type RecordSummary,
  type UpdateRecordInput,
  type UpsertEntryInput,
} from "@tripic/shared";
import { CurrentUser } from "@/auth/current-user.decorator";
import { ZodValidationPipe } from "@/common/zod-validation.pipe";
import type { StoredEntry } from "@/records/ports/records-repository.port";
import { RecordsService } from "@/records/records.service";

/**
 * 여행 기록 콘텐츠 API (docs/11-records-api-design.md §3).
 * 전역 guard 가 Bearer 를 요구하고, 모든 라우트는 본인 소유 기록만 다룬다.
 */
@Controller("records")
export class RecordsController {
  constructor(private readonly records: RecordsService) {}

  /** POST /records — 기록 생성 (201) */
  @Post()
  create(
    @CurrentUser() userId: string,
    @Body(new ZodValidationPipe(createRecordSchema)) body: CreateRecordInput,
  ): Promise<RecordSummary> {
    return this.records.create(userId, body);
  }

  /** GET /records — 내 기록 목록 (여행일 최근순) */
  @Get()
  list(@CurrentUser() userId: string): Promise<RecordSummary[]> {
    return this.records.list(userId);
  }

  /** DELETE /records — 내 기록 전체 즉시 삭제 (설정의 "전체 기록 초기화") */
  @Delete()
  @HttpCode(204)
  async removeAll(@CurrentUser() userId: string): Promise<void> {
    await this.records.removeAll(userId);
  }

  /** GET /records/:id — 상세 (일차 오름차순) */
  @Get(":id")
  findOne(
    @CurrentUser() userId: string,
    @Param("id") recordId: string,
  ): Promise<RecordDetail> {
    return this.records.findOne(userId, recordId);
  }

  /** PATCH /records/:id — 제목/테마/문체/해시태그 부분 수정 */
  @Patch(":id")
  update(
    @CurrentUser() userId: string,
    @Param("id") recordId: string,
    @Body(new ZodValidationPipe(updateRecordSchema)) body: UpdateRecordInput,
  ): Promise<RecordSummary> {
    return this.records.update(userId, recordId, body);
  }

  /** DELETE /records/:id — 기록 즉시 삭제 (일기 cascade) */
  @Delete(":id")
  @HttpCode(204)
  async remove(
    @CurrentUser() userId: string,
    @Param("id") recordId: string,
  ): Promise<void> {
    await this.records.remove(userId, recordId);
  }

  /** PUT /records/:id/days/:date/entry — 날짜별 일기 작성/수정 (upsert) */
  @Put(":id/days/:date/entry")
  upsertEntry(
    @CurrentUser() userId: string,
    @Param("id") recordId: string,
    @Param("date", new ZodValidationPipe(entryDateSchema)) date: string,
    @Body(new ZodValidationPipe(upsertEntrySchema)) body: UpsertEntryInput,
  ): Promise<StoredEntry> {
    return this.records.upsertEntry(userId, recordId, date, body);
  }

  /** DELETE /records/:id/days/:date/entry — 날짜별 일기 즉시 삭제 */
  @Delete(":id/days/:date/entry")
  @HttpCode(204)
  async removeEntry(
    @CurrentUser() userId: string,
    @Param("id") recordId: string,
    @Param("date", new ZodValidationPipe(entryDateSchema)) date: string,
  ): Promise<void> {
    await this.records.removeEntry(userId, recordId, date);
  }
}
