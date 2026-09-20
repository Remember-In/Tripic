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

- 서버 구현 완료·배포 확인 필요: 웹 카카오 authorization code 교환, refresh cookie rotation, 로그아웃
- 연결 완료: 기록·메모·사진 저장, 대표 사진 목록, 수정·삭제 및 다른 기기 조회
- 연결 완료: 관광지 키워드 검색 (`GET /tourism/places?keyword=...`)
- 대기: 선택한 관광지의 방문 지역 저장, 지역 진행률 조회, 지도 스탬프 집계

장소 선택 UI는 서버의 `KtoListItem` 계약을 사용한다. 방문 지역 저장 API가 추가되기 전까지 장소 선택은 선택 사항이며 기록 생성 자체를 막지 않는다. 추후 방문 기록 API 연결 시 `RecordCreatePage`의 `selectedPlace`를 그대로 전달하고, 지역 진행률 응답을 `HomePage`의 `TravelMap`에 주입한다.

개인정보 처리방침과 서비스 이용약관은 인증 없이 각각 `/privacy`, `/terms`에서 확인할 수 있다.

카카오 REST API 키의 클라이언트 시크릿이 활성화되어 있으므로 API 배포 환경에는 `KAKAO_CLIENT_SECRET`을 반드시 비밀 환경변수로 설정한다. 이 값은 웹 번들 또는 Git에 포함하면 안 된다.
