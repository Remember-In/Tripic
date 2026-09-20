import type { RecordDetail } from "@tripic/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  deleteRecordEntry,
  getRecord,
  updateRecord,
  upsertRecordEntry,
} from "@/entities/record/api/records";

function parseHashtags(value: string) {
  return value
    .split(/[#\s,]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 10);
}

function RecordEditForm({ record }: { record: RecordDetail }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(record.title);
  const [hashtags, setHashtags] = useState(record.hashtags.join(" "));
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      record.days.map((day) => [day.date, day.entry?.content ?? ""]),
    ),
  );

  const save = useMutation({
    mutationFn: async () => {
      await updateRecord(record.id, {
        hashtags: parseHashtags(hashtags),
        title: title.trim(),
      });

      await Promise.all(
        record.days.map(async (day) => {
          const content = notes[day.date]?.trim() ?? "";
          if (content) {
            await upsertRecordEntry(record.id, day.date, {
              content,
              source: "USER",
            });
          } else if (day.entry) {
            await deleteRecordEntry(record.id, day.date);
          }
        }),
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["records"] }),
        queryClient.invalidateQueries({ queryKey: ["records", record.id] }),
      ]);
      navigate(`/records/${record.id}`, { replace: true });
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (title.trim()) save.mutate();
  };

  return (
    <form className="compose-grid" onSubmit={submit}>
      <section className="compose-card">
        <h2>기본 정보</h2>
        <label>
          <span>기록 제목</span>
          <input
            maxLength={50}
            onChange={(event) => setTitle(event.target.value)}
            required
            value={title}
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

      {record.days.map((day, index) => (
        <section className="compose-card" key={day.date}>
          <h2>{index + 1}일차 메모</h2>
          <p className="section-description">{day.date.replaceAll("-", ".")}</p>
          <label>
            <span>여행 메모</span>
            <textarea
              maxLength={5000}
              onChange={(event) =>
                setNotes((current) => ({
                  ...current,
                  [day.date]: event.target.value,
                }))
              }
              placeholder="기억하고 싶은 순간을 적어 주세요."
              rows={6}
              value={notes[day.date] ?? ""}
            />
          </label>
        </section>
      ))}

      {save.isError ? (
        <p className="form-error compose-error" role="alert">
          기록을 수정하지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      ) : null}
      <button
        className="primary-button compose-submit"
        disabled={save.isPending || !title.trim()}
        type="submit"
      >
        {save.isPending ? "수정 내용을 저장하는 중…" : "수정 완료"}
      </button>
    </form>
  );
}

export function RecordEditPage() {
  const { recordId } = useParams();
  const record = useQuery({
    enabled: Boolean(recordId),
    queryFn: () => getRecord(recordId ?? ""),
    queryKey: ["records", recordId],
  });

  if (record.isPending) {
    return (
      <main className="page compose-page">
        <p className="state-card">기록을 불러오고 있어요.</p>
      </main>
    );
  }

  if (!record.data || record.isError) {
    return (
      <main className="page compose-page">
        <p className="state-card">수정할 기록을 찾지 못했습니다.</p>
      </main>
    );
  }

  return (
    <main className="page compose-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">나의 여행 이야기</p>
          <h1>기록 수정</h1>
        </div>
      </div>
      <RecordEditForm key={record.data.updatedAt} record={record.data} />
    </main>
  );
}
