import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { updateNickname } from "@/entities/user/api/users";
import { useAuthSession } from "@/features/auth-session/model/AuthSessionProvider";
import { requestJson } from "@/shared/api/http";

export function OnboardingPage() {
  const { clearSession, updateUser } = useAuthSession();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState("");
  const [agreed, setAgreed] = useState(false);

  const signup = useMutation({
    mutationFn: () => updateNickname(nickname.trim()),
    onSuccess: (user) => {
      updateUser(user);
      navigate("/", { replace: true });
    },
  });
  const cancel = useMutation({
    mutationFn: () =>
      requestJson<void>("/users/me", { auth: true, method: "DELETE" }),
    onSuccess: () => {
      clearSession();
      navigate("/login", { replace: true });
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!agreed || nickname.trim().length < 2) return;
    signup.mutate();
  };

  return (
    <main className="login-page">
      <section
        className="login-card onboarding-card"
        aria-labelledby="onboarding-title"
      >
        <div className="brand-mark" aria-hidden="true">
          T
        </div>
        <p className="eyebrow">새 계정으로 시작하기</p>
        <h1 id="onboarding-title">프로필 설정</h1>
        <p className="login-description">
          가입 또는 재가입을 완료하려면 Tripic에서 사용할 닉네임을 설정해
          주세요.
        </p>
        <form className="onboarding-form" onSubmit={submit}>
          <label>
            <span>닉네임</span>
            <input
              autoComplete="nickname"
              maxLength={20}
              minLength={2}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="2~20자"
              required
              type="text"
              value={nickname}
            />
          </label>
          <label className="agreement-row">
            <input
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              type="checkbox"
            />
            <span>
              <Link to="/terms" target="_blank">
                서비스 이용약관
              </Link>
              과{" "}
              <Link to="/privacy" target="_blank">
                개인정보 처리방침
              </Link>
              에 동의합니다.
            </span>
          </label>
          <button
            className="primary-button"
            disabled={!agreed || nickname.trim().length < 2 || signup.isPending}
            type="submit"
          >
            {signup.isPending ? "가입 처리 중…" : "가입 완료"}
          </button>
          {signup.isError ? (
            <p className="form-error" role="alert">
              프로필을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.
            </p>
          ) : null}
        </form>
        <button
          className="onboarding-cancel"
          disabled={cancel.isPending}
          onClick={() => cancel.mutate()}
          type="button"
        >
          가입 취소
        </button>
        {cancel.isError ? (
          <p className="form-error" role="alert">
            가입 취소를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.
          </p>
        ) : null}
      </section>
    </main>
  );
}
