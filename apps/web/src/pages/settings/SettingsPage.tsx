import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import { clearRecords } from "@/entities/record/api/records";
import { useAuthSession } from "@/features/auth-session/model/AuthSessionProvider";
import { requestJson } from "@/shared/api/http";

export function SettingsPage() {
  const { logout, user } = useAuthSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const clear = useMutation({
    mutationFn: clearRecords,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["records"] });
    },
  });
  const withdraw = useMutation({
    mutationFn: () =>
      requestJson<void>("/users/me", { auth: true, method: "DELETE" }),
    onSuccess: async () => {
      try {
        await logout();
      } finally {
        navigate("/login", { replace: true });
      }
    },
  });

  return (
    <main className="page settings-page">
      <div className="page-heading">
        <h1>설정</h1>
      </div>
      <section className="settings-card">
        <p className="setting-label">로그인 계정</p>
        <strong>{user?.nickname || "Tripic 사용자"}</strong>
        <span>카카오 계정으로 로그인됨</span>
        <button
          className="secondary-button"
          type="button"
          onClick={() => void logout()}
        >
          로그아웃
        </button>
      </section>
      <section className="settings-card">
        <h2>데이터 관리</h2>
        <button
          className="danger-button"
          type="button"
          disabled={clear.isPending}
          onClick={() => {
            if (window.confirm("모든 여행 기록과 사진을 영구 삭제할까요?"))
              clear.mutate();
          }}
        >
          전체 기록 삭제
        </button>
        {clear.isError ? (
          <p className="form-error" role="alert">
            전체 기록을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.
          </p>
        ) : null}
        <button
          className="danger-link"
          type="button"
          disabled={withdraw.isPending}
          onClick={() => {
            if (window.confirm("계정과 모든 데이터를 영구 삭제할까요?"))
              withdraw.mutate();
          }}
        >
          회원탈퇴
        </button>
        {withdraw.isError ? (
          <p className="form-error" role="alert">
            회원탈퇴를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.
          </p>
        ) : null}
      </section>
      <section className="settings-card policy-links">
        <Link to="/privacy">개인정보 처리방침</Link>
        <Link to="/terms">서비스 이용약관</Link>
        <a href="mailto:support@remin.dev">고객지원</a>
      </section>
    </main>
  );
}
