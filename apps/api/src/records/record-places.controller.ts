import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import {
  createRecordPlaceSchema,
  updateRecordPlaceSchema,
  type CreateRecordPlaceInput,
  type UpdateRecordPlaceInput,
} from "@tripic/shared";
import { CurrentUser } from "@/auth/current-user.decorator";
import { ZodValidationPipe } from "@/common/zod-validation.pipe";
import type { StoredRecordPlace } from "@/records/ports/record-places.port";
import { RecordPlacesService } from "@/records/record-places.service";

/**
 * 방문 관광지 API (docs/16 §3).
 *
 * `RecordsController` 와 경로 공간을 공유하지만 컨트롤러를 나눴다 — 기록·일기·사진과
 * 관심사가 다르고, 이쪽만 KTO 검증이 붙는다.
 * `@Get(":recordId/places")` 는 세 segment 라 `RecordsController` 의 `@Get(":id")` 와 겹치지 않는다.
 */
@Controller("records")
export class RecordPlacesController {
  constructor(private readonly places: RecordPlacesService) {}

  /** POST /records/:recordId/places — 사용자가 확정한 관광지를 기록에 추가 (201) */
  @Post(":recordId/places")
  add(
    @CurrentUser() userId: string,
    @Param("recordId") recordId: string,
    @Body(new ZodValidationPipe(createRecordPlaceSchema))
    body: CreateRecordPlaceInput,
  ): Promise<StoredRecordPlace> {
    return this.places.add(userId, recordId, body);
  }

  /** GET /records/:recordId/places — 기록의 방문 관광지 목록 */
  @Get(":recordId/places")
  list(
    @CurrentUser() userId: string,
    @Param("recordId") recordId: string,
  ): Promise<StoredRecordPlace[]> {
    return this.places.list(userId, recordId);
  }

  /** PATCH /records/:recordId/places/:placeId — 관광지·방문일 수정 */
  @Patch(":recordId/places/:placeId")
  update(
    @CurrentUser() userId: string,
    @Param("recordId") recordId: string,
    @Param("placeId") placeId: string,
    @Body(new ZodValidationPipe(updateRecordPlaceSchema))
    body: UpdateRecordPlaceInput,
  ): Promise<StoredRecordPlace> {
    return this.places.update(userId, recordId, placeId, body);
  }

  /** DELETE /records/:recordId/places/:placeId — 즉시 삭제 (204) */
  @Delete(":recordId/places/:placeId")
  @HttpCode(204)
  async remove(
    @CurrentUser() userId: string,
    @Param("recordId") recordId: string,
    @Param("placeId") placeId: string,
  ): Promise<void> {
    await this.places.remove(userId, recordId, placeId);
  }
}
