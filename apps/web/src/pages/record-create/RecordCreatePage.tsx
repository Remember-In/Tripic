import { useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import {
  createRecord,
  deleteRecord,
  uploadRecordPhoto,
  upsertRecordEntry,
} from "@/entities/record/api/records";
import { createRecordPlace } from "@/entities/record-place/api/recordPlaces";
import {
  searchTouristPlaces,
  type TouristPlace,
} from "@/entities/tourist-place/api/searchTouristPlaces";
import { visitRegionApiEnabled } from "@/shared/config/env";
import { preparePhoto } from "@/shared/lib/image/preparePhoto";

function today() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function previewEnabled() {
  return (
    import.meta.env.DEV && sessionStorage.getItem("tripic-preview") === "1"
  );
}

export function RecordCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [keyword, setKeyword] = useState("");
  const [places, setPlaces] = useState<TouristPlace[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<TouristPlace | null>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    if (!keyword.trim()) return;
    setSearching(true);
    setError(null);
    try {
      setPlaces(await searchTouristPlaces(keyword));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "관광지를 검색하지 못했습니다.",
      );
    } finally {
      setSearching(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (files.length === 0) {
      setError("여행 사진을 한 장 이상 선택해 주세요.");
      return;
    }
    if (previewEnabled()) {
      setError(
        "미리보기에서는 화면만 확인할 수 있습니다. 실제 저장은 서버 연결 후 가능합니다.",
      );
      return;
    }

    setSaving(true);
    let createdRecordId: string | null = null;
    try {
      const tags = hashtags
        .split(/[#,\s]+/)
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 10);
      const record = await createRecord({
        title: title.trim(),
        hashtags: tags,
      });
      createdRecordId = record.id;
      if (note.trim()) {
        await upsertRecordEntry(record.id, date, {
          content: note.trim(),
          source: "USER",
        });
      }
      for (const file of files) {
        await uploadRecordPhoto(record.id, date, await preparePhoto(file));
      }
      let placeSyncFailed = false;
      if (selectedPlace && visitRegionApiEnabled()) {
        try {
          await createRecordPlace(record.id, {
            contentId: selectedPlace.contentId,
            visitedAt: `${date}T00:00:00.000Z`,
          });
        } catch {
          placeSyncFailed = true;
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["records"] });
      if (selectedPlace && visitRegionApiEnabled()) {
        await queryClient.invalidateQueries({ queryKey: ["map-progress"] });
      }
      navigate(
        `/records/${record.id}${placeSyncFailed ? "?placeSync=failed" : ""}`,
      );
    } catch (reason) {
      let cleanupFailed = false;
      if (createdRecordId) {
        try {
          await deleteRecord(createdRecordId);
          queryClient.removeQueries({ queryKey: ["records", createdRecordId] });
        } catch {
          cleanupFailed = true;
        }
      }
      setError(
        `${
          reason instanceof Error
            ? reason.message
            : "기록을 저장하지 못했습니다."
        }${
          cleanupFailed
            ? " 일부 데이터가 남았을 수 있습니다. 내 기록에서 확인해 주세요."
            : ""
        }`,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="page compose-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">새 여행 기록</p>
          <h1>사진으로 기록하기</h1>
        </div>
      </div>

      <form className="compose-grid" onSubmit={submit}>
        <section className="compose-card">
          <h2>1. 여행 사진</h2>
          <p className="section-description">
            사진의 위치정보는 읽지 않습니다. 업로드 사본은 메타데이터를 제거하고
            1MB 이하로 압축합니다.
          </p>
          <label className="photo-picker">
            <input
              accept="image/*"
              multiple
              onChange={(event) =>
                setFiles(
                  Array.from(event.currentTarget.files ?? []).slice(0, 20),
                )
              }
              type="file"
            />
            <strong>사진 선택</strong>
            <span>
              {files.length > 0 ? `${files.length}장 선택됨` : "최대 20장"}
            </span>
          </label>
          {files.length > 0 ? (
            <div className="selected-photo-list">
              {files.map((file) => (
                <span key={`${file.name}-${file.lastModified}`}>
                  {file.name}
                </span>
              ))}
            </div>
          ) : null}
        </section>

        <section className="compose-card">
          <h2>2. 방문 정보</h2>
          <div className="field-row">
            <label>
              <span>기록 제목</span>
              <input
                maxLength={50}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="예: 가을 경주 여행"
                required
                value={title}
              />
            </label>
            <label>
              <span>방문 날짜</span>
              <input
                onChange={(event) => setDate(event.target.value)}
                required
                type="date"
                value={date}
              />
            </label>
          </div>
          <label>
            <span>여행 메모</span>
            <textarea
              maxLength={5000}
              onChange={(event) => setNote(event.target.value)}
              placeholder="기억하고 싶은 순간을 적어 주세요."
              rows={5}
              value={note}
            />
          </label>
          <label>
            <span>해시태그</span>
            <input
              onChange={(event) => setHashtags(event.target.value)}
              placeholder="#경주 #가을여행"
              value={hashtags}
            />
          </label>
        </section>

        <section className="compose-card place-section">
          <h2>3. 관광지 확인 (선택)</h2>
          <p className="section-description">
            현재 위치 대신 관광지 이름을 직접 검색해 방문 지역을 확정합니다.
          </p>
          <div className="search-row">
            <input
              aria-label="관광지 키워드"
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void search();
                }
              }}
              placeholder="경복궁, 해운대처럼 검색"
              value={keyword}
            />
            <button
              className="secondary-button"
              disabled={searching}
              onClick={() => void search()}
              type="button"
            >
              {searching ? "검색 중" : "검색"}
            </button>
          </div>
          <div className="place-results">
            {places.map((place) => (
              <button
                className={
                  selectedPlace?.contentId === place.contentId
                    ? "place-result selected"
                    : "place-result"
                }
                key={place.contentId}
                onClick={() => setSelectedPlace(place)}
                type="button"
              >
                <strong>{place.title}</strong>
                <span>{place.address}</span>
              </button>
            ))}
          </div>
          {selectedPlace ? (
            <p className="selected-place">선택됨 · {selectedPlace.title}</p>
          ) : null}
          <p className="integration-note">
            {visitRegionApiEnabled()
              ? "관광지를 선택하면 저장 후 방문 지역 스탬프에 반영됩니다."
              : "관광지를 선택하지 않아도 기록을 저장할 수 있습니다. 서버 API 배포 후 선택한 장소의 스탬프 반영이 활성화됩니다."}
          </p>
        </section>

        {error ? <p className="form-error compose-error">{error}</p> : null}
        <button
          className="primary-button compose-submit"
          disabled={saving}
          type="submit"
        >
          {saving ? "사진을 정리하고 저장하는 중…" : "여행 기록 저장"}
        </button>
      </form>
    </main>
  );
}
