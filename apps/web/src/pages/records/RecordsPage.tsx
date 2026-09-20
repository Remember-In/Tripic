import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { getRecord, listRecords } from "@/entities/record/api/records";
import { AuthenticatedImage } from "@/shared/ui/authenticated-image/AuthenticatedImage";

function RecordCover({ recordId }: { recordId: string }) {
  const detail = useQuery({
    queryFn: () => getRecord(recordId),
    queryKey: ["records", recordId],
  });
  const photo = detail.data?.days.flatMap((day) => day.photos)[0];
  return photo ? (
    <AuthenticatedImage alt="사용자가 등록한 여행 사진" path={photo.url} />
  ) : (
    <div
      className="image-placeholder"
      role="img"
      aria-label="등록된 사진 없음"
    />
  );
}

function dateRange(startDate: string | null, endDate: string | null) {
  if (!startDate) return "날짜 미정";
  if (!endDate || startDate === endDate) return startDate.replaceAll("-", ".");
  return `${startDate.replaceAll("-", ".")}–${endDate.replaceAll("-", ".")}`;
}

export function RecordsPage() {
  const records = useQuery({ queryKey: ["records"], queryFn: listRecords });

  return (
    <main className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">사진으로 남긴 순간</p>
          <h1>내 여행 기록</h1>
        </div>
      </div>

      {records.isPending ? (
        <p className="state-card">기록을 불러오고 있어요.</p>
      ) : null}
      {records.isError ? (
        <p className="state-card">기록을 불러오지 못했습니다.</p>
      ) : null}
      {records.data?.length === 0 ? (
        <section className="empty-card">
          <h2>아직 여행 기록이 없어요</h2>
          <p>첫 번째 여행 사진으로 나만의 지도를 채워보세요.</p>
        </section>
      ) : null}

      <section className="record-grid" aria-label="여행 기록 목록">
        {records.data?.map((record) => (
          <Link
            className="record-card"
            key={record.id}
            to={`/records/${record.id}`}
          >
            <div className="record-cover">
              <RecordCover recordId={record.id} />
            </div>
            <div className="record-card-body">
              <span>{dateRange(record.startDate, record.endDate)}</span>
              <h2>{record.title}</h2>
              <p>{record.hashtags.join(" ") || "나의 여행 기록"}</p>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
