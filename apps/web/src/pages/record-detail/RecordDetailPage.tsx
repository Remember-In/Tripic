import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";

import { deleteRecord, getRecord } from "@/entities/record/api/records";
import { AuthenticatedImage } from "@/shared/ui/authenticated-image/AuthenticatedImage";

export function RecordDetailPage() {
  const { recordId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const record = useQuery({
    enabled: Boolean(recordId),
    queryFn: () => getRecord(recordId ?? ""),
    queryKey: ["records", recordId],
  });
  const remove = useMutation({
    mutationFn: () => deleteRecord(recordId ?? ""),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["records"] });
      navigate("/records", { replace: true });
    },
  });

  if (record.isPending)
    return (
      <main className="page">
        <p className="state-card">기록을 불러오고 있어요.</p>
      </main>
    );
  if (!record.data || record.isError)
    return (
      <main className="page">
        <p className="state-card">기록을 찾지 못했습니다.</p>
      </main>
    );

  return (
    <main className="page detail-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">나의 여행 이야기</p>
          <h1>{record.data.title}</h1>
          <p>{record.data.hashtags.join(" ")}</p>
        </div>
        <div className="heading-actions">
          <Link className="secondary-button" to={`/records/${recordId}/edit`}>
            기록 수정
          </Link>
          <button
            className="danger-button"
            type="button"
            disabled={remove.isPending}
            onClick={() => {
              if (window.confirm("이 여행 기록을 영구 삭제할까요?"))
                remove.mutate();
            }}
          >
            기록 삭제
          </button>
        </div>
        {remove.isError ? (
          <p className="form-error" role="alert">
            기록을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.
          </p>
        ) : null}
      </div>

      <div className="day-list">
        {record.data.days.map((day, index) => (
          <article className="day-card" key={day.date}>
            <header>
              <strong>{index + 1}일차</strong>
              <span>{day.date.replaceAll("-", ".")}</span>
            </header>
            <div className="photo-grid">
              {day.photos.map((photo) => (
                <AuthenticatedImage
                  alt={`${index + 1}일차에 사용자가 등록한 여행 사진`}
                  key={photo.id}
                  path={photo.url}
                />
              ))}
            </div>
            <p className="day-note">
              {day.entry?.content || "작성한 여행 메모가 없습니다."}
            </p>
          </article>
        ))}
      </div>
    </main>
  );
}
