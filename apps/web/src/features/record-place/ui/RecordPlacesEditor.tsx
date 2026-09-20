import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  createRecordPlace,
  deleteRecordPlace,
  listRecordPlaces,
  updateRecordPlace,
} from "@/entities/record-place/api/recordPlaces";
import {
  searchTouristPlaces,
  type TouristPlace,
} from "@/entities/tourist-place/api/searchTouristPlaces";
import { visitRegionApiEnabled } from "@/shared/config/env";

function today() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function RecordPlacesEditor({ recordId }: { recordId: string }) {
  const enabled = visitRegionApiEnabled();
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<TouristPlace[]>([]);
  const [selected, setSelected] = useState<TouristPlace | null>(null);
  const [visitedDate, setVisitedDate] = useState(today);
  const [searchError, setSearchError] = useState<string | null>(null);

  const places = useQuery({
    enabled,
    queryFn: () => listRecordPlaces(recordId),
    queryKey: ["record-places", recordId],
    retry: false,
  });

  const invalidatePlaces = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["record-places", recordId] }),
      queryClient.invalidateQueries({ queryKey: ["map-progress"] }),
    ]);
  };

  const add = useMutation({
    mutationFn: () =>
      createRecordPlace(recordId, {
        contentId: selected?.contentId ?? "",
        visitedAt: visitedDate,
      }),
    onSuccess: async () => {
      setKeyword("");
      setResults([]);
      setSelected(null);
      await invalidatePlaces();
    },
  });

  const remove = useMutation({
    mutationFn: (placeId: string) => deleteRecordPlace(recordId, placeId),
    onSuccess: invalidatePlaces,
  });

  const changeDate = useMutation({
    mutationFn: ({ placeId, date }: { date: string; placeId: string }) =>
      updateRecordPlace(recordId, placeId, {
        visitedAt: date,
      }),
    onSuccess: invalidatePlaces,
  });

  const search = async () => {
    if (!keyword.trim()) return;
    setSearchError(null);
    try {
      setResults(await searchTouristPlaces(keyword));
    } catch (reason) {
      setSearchError(
        reason instanceof Error
          ? reason.message
          : "관광지를 검색하지 못했습니다.",
      );
    }
  };

  if (!enabled) {
    return (
      <section className="compose-card">
        <h2>방문 관광지</h2>
        <p className="integration-note">
          클라이언트 준비가 완료되었습니다. 서버 API 배포 후 환경변수를 켜면
          관광지 추가·수정·삭제가 활성화됩니다.
        </p>
      </section>
    );
  }

  return (
    <section className="compose-card">
      <h2>방문 관광지</h2>
      <p className="section-description">
        기록에 연결된 관광지를 추가하거나 방문일을 수정할 수 있습니다.
      </p>

      {places.isPending ? (
        <p className="section-description">방문 정보를 불러오고 있어요.</p>
      ) : null}
      {places.isError ? (
        <p className="form-error">방문 정보를 불러오지 못했습니다.</p>
      ) : null}

      {places.data && places.data.length > 0 ? (
        <ul className="stored-place-list editable">
          {places.data.map((place) => (
            <li className="stored-place-item" key={place.id}>
              <div>
                <strong>관광지 {place.contentId}</strong>
                <span>지역 코드 {place.areaCode}</span>
              </div>
              <input
                aria-label={`관광지 ${place.contentId} 방문일`}
                defaultValue={place.visitedAt.slice(0, 10)}
                onBlur={(event) => {
                  const nextDate = event.currentTarget.value;
                  if (nextDate && nextDate !== place.visitedAt.slice(0, 10)) {
                    changeDate.mutate({ date: nextDate, placeId: place.id });
                  }
                }}
                type="date"
              />
              <button
                className="danger-link"
                disabled={remove.isPending}
                onClick={() => remove.mutate(place.id)}
                type="button"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {places.data?.length === 0 ? (
        <p className="section-description">아직 연결된 관광지가 없습니다.</p>
      ) : null}

      <div className="search-row">
        <input
          aria-label="추가할 관광지 키워드"
          onChange={(event) => setKeyword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void search();
            }
          }}
          placeholder="추가할 관광지 검색"
          value={keyword}
        />
        <button
          className="secondary-button"
          onClick={() => void search()}
          type="button"
        >
          검색
        </button>
      </div>
      {searchError ? <p className="form-error">{searchError}</p> : null}
      <div className="place-results">
        {results.map((place) => (
          <button
            className={
              selected?.contentId === place.contentId
                ? "place-result selected"
                : "place-result"
            }
            key={place.contentId}
            onClick={() => setSelected(place)}
            type="button"
          >
            <strong>{place.title}</strong>
            <span>{place.address}</span>
          </button>
        ))}
      </div>
      {selected ? (
        <div className="place-add-row">
          <input
            aria-label="새 관광지 방문일"
            onChange={(event) => setVisitedDate(event.target.value)}
            type="date"
            value={visitedDate}
          />
          <button
            className="secondary-button"
            disabled={add.isPending}
            onClick={() => add.mutate()}
            type="button"
          >
            {add.isPending ? "추가 중" : "관광지 추가"}
          </button>
        </div>
      ) : null}
      {add.isError || remove.isError || changeDate.isError ? (
        <p className="form-error">
          방문 정보를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      ) : null}
    </section>
  );
}
