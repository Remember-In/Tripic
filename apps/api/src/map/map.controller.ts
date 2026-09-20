import { Controller, Get } from "@nestjs/common";
import type { MapProgressResponse } from "@tripic/shared";
import { CurrentUser } from "@/auth/current-user.decorator";
import { RecordPlacesService } from "@/records/record-places.service";

/**
 * 지도 진행률 API (docs/16 §3.5).
 *
 * 진행률 테이블을 따로 두지 않고 `record_places` 를 조회 시점에 집계하므로, 이 컨트롤러는
 * 방문 관광지 유스케이스를 그대로 쓴다. 기록·장소·계정이 지워지면 결과가 즉시 줄어든다.
 */
@Controller("map")
export class MapController {
  constructor(private readonly places: RecordPlacesService) {}

  /** GET /map/progress — 로그인 사용자의 시·도 방문 집계 */
  @Get("progress")
  progress(@CurrentUser() userId: string): Promise<MapProgressResponse> {
    return this.places.progress(userId);
  }
}
