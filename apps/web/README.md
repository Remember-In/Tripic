# Tripic Web

## 로컬 실행

```bash
cp apps/web/.env.example apps/web/.env.local
pnpm --filter @tripic/web dev
```

`apps/web/.env.local`에 다음 값을 설정한다.

```dotenv
VITE_KAKAO_REST_API_KEY=<카카오 REST API 키>
VITE_KAKAO_REDIRECT_URI=http://127.0.0.1:5173/auth/kakao/callback
TRIPIC_API_PROXY_TARGET=https://tripic.remin.dev
```

## 카카오 개발자 콘솔

1. Web 플랫폼 사이트 도메인에 실제 웹 도메인과 로컬 테스트 주소를 등록한다.
2. 카카오 로그인 Redirect URI에 `<웹 도메인>/auth/kakao/callback`을 등록한다.
3. JavaScript 키가 아니라 **REST API 키**를 `VITE_KAKAO_REST_API_KEY`에 사용한다.

## 배포 계약

- 브라우저는 모든 서버 요청을 같은 origin의 `/api/*`로 호출한다.
- 웹 서버/호스팅에서 `/api/*`를 Tripic API의 `/*`로 reverse proxy 해야 한다.
- refresh token은 `/api/auth` 경로의 HttpOnly, SameSite=Lax cookie로만 전달된다.
- 사진은 브라우저에서 픽셀만 새 JPEG로 다시 그려 EXIF/GPS 메타데이터를 제거한 뒤 1 MiB 이하로 업로드한다.

## 현재 서버 연결 상태

- 완료: 웹 카카오 authorization code 교환, refresh cookie rotation, 로그아웃
- 완료: 기록·메모·사진 저장 및 다른 기기 조회
- 대기: 관광지 키워드 검색, 방문 지역 저장, 지도 스탬프 집계

마지막 세 기능은 `apps/api/AGENTS.md`의 위치정보지원센터 사전 검토 조건이 해제된 뒤 서버 API를 노출해야 한다. 웹은 `/tourism/search?keyword=...` 계약과 장소 선택 UI까지 준비되어 있다.

카카오 REST API 키의 클라이언트 시크릿이 활성화되어 있으므로 API 배포 환경에는 `KAKAO_CLIENT_SECRET`을 반드시 비밀 환경변수로 설정한다. 이 값은 웹 번들 또는 Git에 포함하면 안 된다.
