import { useQuery } from "@tanstack/react-query";

import {
  listRecordPlaces,
  type RecordPlace,
} from "@/entities/record-place/api/recordPlaces";
import { getTouristPlace } from "@/entities/tourist-place/api/searchTouristPlaces";
import { visitRegionApiEnabled } from "@/shared/config/env";

function PlaceSummary({ place }: { place: RecordPlace }) {
  const detail = useQuery({
    queryFn: () => getTouristPlace(place.contentId),
    queryKey: ["tourism-place", place.contentId],
    retry: false,
  });

  return (
    <li className="stored-place-item">
      <div>
        <strong>{detail.data?.title ?? `관광지 ${place.contentId}`}</strong>
        <span>
          {detail.data?.address ||
            `지역 코드 ${place.areaCode}${place.sigunguCode ? ` · ${place.sigunguCode}` : ""}`}
        </span>
      </div>
      <time dateTime={place.visitedAt}>{place.visitedAt.slice(0, 10)}</time>
    </li>
  );
}

export function RecordPlacesSummary({ recordId }: { recordId: string }) {
  const enabled = visitRegionApiEnabled();
  const places = useQuery({
    enabled,
    queryFn: () => listRecordPlaces(recordId),
    queryKey: ["record-places", recordId],
    retry: false,
  });

  if (!enabled) return null;

  return (
    <section className="day-card stored-places-card">
      <header>
        <strong>방문 관광지</strong>
      </header>
      {places.isPending ? <p>방문 정보를 불러오고 있어요.</p> : null}
      {places.isError ? (
        <p className="form-error">방문 정보를 불러오지 못했습니다.</p>
      ) : null}
      {places.data?.length === 0 ? (
        <p className="section-description">저장된 관광지가 없습니다.</p>
      ) : null}
      {places.data && places.data.length > 0 ? (
        <ul className="stored-place-list">
          {places.data.map((place) => (
            <PlaceSummary key={place.id} place={place} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}
