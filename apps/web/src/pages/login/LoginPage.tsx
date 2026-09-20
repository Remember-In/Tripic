import { useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { useAuthSession } from "@/features/auth-session/model/AuthSessionProvider";
import { kakaoLoginConfig } from "@/shared/config/env";

const KAKAO_AUTHORIZE_URL = "https://kauth.kakao.com/oauth/authorize";
export const KAKAO_STATE_KEY = "tripic:kakao-oauth-state";

function randomState() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export function LoginPage() {
  const { status } = useAuthSession();
  const [error, setError] = useState<string | null>(null);

  if (status === "authenticated") return <Navigate to="/" replace />;

  const login = () => {
    try {
      const { redirectUri, restApiKey } = kakaoLoginConfig();
      const state = randomState();
      sessionStorage.setItem(KAKAO_STATE_KEY, state);
      const query = new URLSearchParams({
        client_id: restApiKey,
        redirect_uri: redirectUri,
        response_type: "code",
        state,
      });
      window.location.assign(`${KAKAO_AUTHORIZE_URL}?${query}`);
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "카카오 로그인을 시작하지 못했습니다.",
      );
    }
  };

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="brand-mark" aria-hidden="true">
          T
        </div>
        <p className="eyebrow">나의 사진으로 채우는 여행 지도</p>
        <h1 id="login-title">Tripic</h1>
        <p className="login-description">
          여행 사진을 기록하고, 방문한 지역에 나만의 스탬프를 남겨보세요.
        </p>
        <button className="kakao-button" type="button" onClick={login}>
          <span aria-hidden="true">●</span>
          카카오로 시작하기
        </button>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <p className="legal-caption">
          로그인하면 <Link to="/terms">서비스 이용약관</Link>과{" "}
          <Link to="/privacy">개인정보 처리방침</Link>에 동의하게 됩니다.
        </p>
        {import.meta.env.DEV ? (
          <a className="preview-link" href="/?preview=1">
            개발 UI 미리보기
          </a>
        ) : null}
      </section>
    </main>
  );
}
