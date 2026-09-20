import { useQueries, useQuery } from "@tanstack/react-query";
import type { RegionProgress } from "@tripic/shared";
import { Link } from "react-router-dom";

import {
  getMapProgress,
  listRecordPlaces,
} from "@/entities/record-place/api/recordPlaces";
import { listRecords } from "@/entities/record/api/records";
import { visitRegionApiEnabled } from "@/shared/config/env";
import { TravelMap } from "@/widgets/travel-map/TravelMap";

const PREVIEW_REGION_PROGRESS: RegionProgress[] = [
  {
    areaCode: "1",
    firstVisitedAt: "2026-09-01",
    id: "preview-seoul",
    lastVisitedAt: "2026-09-01",
    visitCount: 1,
  },
  {
    areaCode: "6",
    firstVisitedAt: "2026-09-02",
    id: "preview-busan",
    lastVisitedAt: "2026-09-02",
    visitCount: 1,
  },
];

const PREVIEW_SIGUNGU_KEYS = new Set(["1:23", "6:16"]);

function previewEnabled() {
  return (
    import.meta.env.DEV && sessionStorage.getItem("tripic-preview") === "1"
  );
}

export function HomePage() {
  const isPreview = previewEnabled();
  const regionApiEnabled = visitRegionApiEnabled();
  const records = useQuery({ queryKey: ["records"], queryFn: listRecords });
  const progress = useQuery({
    enabled: !isPreview && regionApiEnabled,
    queryFn: getMapProgress,
    queryKey: ["map-progress"],
    retry: false,
  });
  const recordPlaceQueries = useQueries({
    queries:
      !isPreview && regionApiEnabled
        ? (records.data ?? []).map((record) => ({
            queryFn: () => listRecordPlaces(record.id),
            queryKey: ["record-places", record.id],
            retry: false,
          }))
        : [],
  });
  const regionProgress = isPreview
    ? PREVIEW_REGION_PROGRESS
    : (progress.data?.regions ?? []);
  const visitedAreaCodes = new Set(
    regionProgress
      .filter((region) => region.visitCount > 0)
      .map((region) => region.areaCode),
  );
  const visitedSigunguKeys = isPreview
    ? PREVIEW_SIGUNGU_KEYS
    : new Set(
        recordPlaceQueries.flatMap((query) =>
          (query.data ?? []).flatMap((place) =>
            place.sigunguCode ? [`${place.areaCode}:${place.sigunguCode}`] : [],
          ),
        ),
      );

  return (
    <main className="page home-layout">
      <section>
        <div className="page-heading">
          <div>
            <p className="eyebrow">나의 발자국</p>
            <h1>여행 지도</h1>
          </div>
          <Link className="secondary-button" to="/records">
            내 기록 보기
          </Link>
        </div>
        <div className="map-card">
          <div className="map-preview" aria-label="대한민국 여행 지도">
            <TravelMap
              visitedAreaCodes={visitedAreaCodes}
              visitedSigunguKeys={visitedSigunguKeys}
            />
          </div>
          <p className="map-caption">
            지역을 눌러 시·군·구까지 확인할 수 있습니다. 확정한 방문지는
            연두색으로 표시됩니다.
          </p>
        </div>
      </section>

      <aside className="dashboard-panel">
        <div className="stat-grid">
          <article className="stat-card">
            <strong>
              {isPreview
                ? 2
                : regionApiEnabled
                  ? (progress.data?.recordedPlaceCount ?? 0)
                  : (records.data?.length ?? 0)}
            </strong>
            <span>
              {regionApiEnabled || isPreview ? "기록한 관광지" : "여행 기록"}
            </span>
          </article>
          <article className="stat-card">
            <strong>
              {isPreview
                ? visitedAreaCodes.size
                : (progress.data?.visitedAreaCount ?? 0)}
            </strong>
            <span>방문 지역</span>
          </article>
        </div>
        <div className="notice-card">
          <strong>
            {progress.isError ? "스탬프를 불러오지 못했어요" : "지도 스탬프"}
          </strong>
          <p>
            {regionApiEnabled || isPreview
              ? "키워드로 확정한 관광지의 시·도 스탬프가 지도에 표시됩니다."
              : "클라이언트 연결은 준비되었습니다. 서버 API 배포 후 스탬프가 활성화됩니다."}
          </p>
        </div>
        <Link className="primary-button" to="/records/new">
          사진으로 기록 시작
        </Link>
      </aside>
    </main>
  );
}
