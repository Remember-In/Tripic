import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import {
  createRecordSchema,
  entryDateSchema,
  updateRecordSchema,
  upsertEntrySchema,
  type CreateRecordInput,
  type RecordDetail,
  type RecordSummary,
  type RecordPhoto,
  type UpdateRecordInput,
  type UpsertEntryInput,
} from "@tripic/shared";
import { CurrentUser } from "@/auth/current-user.decorator";
import { ZodValidationPipe } from "@/common/zod-validation.pipe";
import type { StoredEntry } from "@/records/ports/records-repository.port";
import { MAX_PHOTO_BYTES, RecordsService } from "@/records/records.service";

/**
 * multer 메모리 스토리지가 넘겨주는 값 중 실제로 쓰는 부분만 선언한다.
 * 전역 `Express.Multer` 네임스페이스에 의존하지 않아 타입 로딩 순서와 무관하다.
 */
interface UploadedPhoto {
  buffer: Buffer<ArrayBuffer>;
}

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

  /**
   * POST /records/:id/days/:date/photos — 위치 메타데이터가 제거된 사본 업로드 (201).
   * multipart 필드명은 `photo`. 스트림 단계에서 크기를 잘라 과대 요청을 메모리에 담지 않는다.
   */
  @Post(":id/days/:date/photos")
  @UseInterceptors(
    FileInterceptor("photo", { limits: { fileSize: MAX_PHOTO_BYTES } }),
  )
  addPhoto(
    @CurrentUser() userId: string,
    @Param("id") recordId: string,
    @Param("date", new ZodValidationPipe(entryDateSchema)) date: string,
    @UploadedFile() file: UploadedPhoto | undefined,
  ): Promise<RecordPhoto> {
    if (!file) throw new BadRequestException("photo file is required");
    return this.records.addPhoto(userId, recordId, date, file.buffer);
  }

  /**
   * GET /records/:id/days/:date/photos/:photoId — 사진 바이너리 서빙.
   * 콘텐츠 스니핑을 막고(nosniff), 본인 사진이므로 캐시는 private 으로 둔다.
   */
  @Get(":id/days/:date/photos/:photoId")
  @Header("X-Content-Type-Options", "nosniff")
  @Header("Cache-Control", "private, max-age=300")
  async servePhoto(
    @CurrentUser() userId: string,
    @Param("id") recordId: string,
    @Param("date", new ZodValidationPipe(entryDateSchema)) date: string,
    @Param("photoId") photoId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const photo = await this.records.findPhoto(userId, recordId, date, photoId);
    response.setHeader("Content-Type", photo.mimeType);
    return new StreamableFile(photo.data);
  }

  /** DELETE /records/:id/days/:date/photos/:photoId — 사진 즉시 삭제 */
  @Delete(":id/days/:date/photos/:photoId")
  @HttpCode(204)
  async removePhoto(
    @CurrentUser() userId: string,
    @Param("id") recordId: string,
    @Param("date", new ZodValidationPipe(entryDateSchema)) date: string,
    @Param("photoId") photoId: string,
  ): Promise<void> {
    await this.records.removePhoto(userId, recordId, date, photoId);
  }
}
