import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { listRecords } from "@/entities/record/api/records";
import { TravelMap } from "@/widgets/travel-map/TravelMap";

export function HomePage() {
  const records = useQuery({ queryKey: ["records"], queryFn: listRecords });

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
              visitedAreaCodes={
                import.meta.env.DEV &&
                sessionStorage.getItem("tripic-preview") === "1"
                  ? new Set(["1", "6"])
                  : new Set()
              }
            />
          </div>
          <p className="map-caption">
            키워드로 확정한 방문 지역이 이 지도에 스탬프로 표시됩니다.
          </p>
        </div>
      </section>

      <aside className="dashboard-panel">
        <div className="stat-grid">
          <article className="stat-card">
            <strong>{records.data?.length ?? 0}</strong>
            <span>여행 기록</span>
          </article>
          <article className="stat-card">
            <strong>0</strong>
            <span>방문 지역</span>
          </article>
        </div>
        <div className="notice-card">
          <strong>스탬프 기록 준비 중</strong>
          <p>
            관광지를 키워드로 검색해 확정하면 시·도와 시·군·구 스탬프를 남길 수
            있어요.
          </p>
        </div>
        <Link className="primary-button" to="/records/new">
          사진으로 기록 시작
        </Link>
      </aside>
    </main>
  );
}
