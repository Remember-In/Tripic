import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import {
  type WebLoginResult,
  useAuthSession,
} from "@/features/auth-session/model/AuthSessionProvider";
import { KAKAO_STATE_KEY } from "@/pages/login/LoginPage";
import { requestJson } from "@/shared/api/http";
import { kakaoLoginConfig } from "@/shared/config/env";

export function KakaoCallbackPage() {
  const { completeLogin } = useAuthSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const callbackHandled = useRef(false);

  useEffect(() => {
    // React StrictMode는 개발 환경에서 effect를 두 번 실행한다. OAuth code는
    // 일회용이므로 동일 콜백을 두 번 검증하거나 서버로 전송하지 않는다.
    if (callbackHandled.current) return;
    callbackHandled.current = true;

    const code = params.get("code");
    const state = params.get("state");
    const expectedState = sessionStorage.getItem(KAKAO_STATE_KEY);
    sessionStorage.removeItem(KAKAO_STATE_KEY);

    if (!code || !state || !expectedState || state !== expectedState) {
      setError("로그인 요청을 확인할 수 없습니다. 다시 시도해 주세요.");
      return;
    }

    const { redirectUri } = kakaoLoginConfig();
    void requestJson<WebLoginResult>("/auth/kakao/web", {
      body: JSON.stringify({ code, redirectUri }),
      method: "POST",
    })
      .then((result) => {
        completeLogin(result);
        navigate(
          result.isNewUser || !result.user.nickname ? "/onboarding" : "/",
          {
            replace: true,
          },
        );
      })
      .catch((callbackError: unknown) => {
        setError(
          callbackError instanceof Error
            ? callbackError.message
            : "카카오 로그인에 실패했습니다.",
        );
      });
  }, [completeLogin, navigate, params]);

  return (
    <main className="centered-state">
      {error ? (
        <section className="state-card">
          <h1>로그인하지 못했어요</h1>
          <p>{error}</p>
          <button
            type="button"
            onClick={() => navigate("/login", { replace: true })}
          >
            다시 로그인하기
          </button>
        </section>
      ) : (
        "카카오 로그인을 확인하고 있어요."
      )}
    </main>
  );
}
