# 웹 클라이언트 지원 서버 설계

| 항목      | 내용                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------ |
| 상태      | §2·§3 구현 완료 (`feat/api-kakao-web-login`) · §4 TourAPI 프록시는 후속                                |
| 배경      | 모바일 앱 배포 지연으로 React 웹(`apps/web`)을 추가한다. 서버는 웹이 없어 못 하는 것만 보완한다        |
| 선행 문서 | [10-auth-db-design.md](./10-auth-db-design.md) — 토큰 전략·rotation·hard delete 정책은 그대로 공유한다 |
| 핵심 제약 | 기존 네이티브 엔드포인트를 **깨뜨리지 않는다**. 웹 전용 경로를 따로 추가한다                           |

---

## 1. 범위와 원칙

- 웹은 `/api/*` → API 서버로 프록시(Vercel rewrite · Vite dev proxy)를 거친다. 브라우저 기준
  **same-origin** 이므로 CORS 설정을 두지 않는다.
- access token 은 웹도 Authorization Bearer 로 쓰고 **메모리에만** 둔다. 쿠키는 refresh token 전용이다.
- 네이티브 앱은 계속 운영된다. `/auth/kakao`·`/auth/refresh`·`/auth/logout`(body 방식)은 그대로 두고
  웹 전용 경로를 나란히 추가한다.
- DB 마이그레이션이 없다 — 카카오 토큰을 저장하지 않으므로(네이티브와 동일) 스키마 변경이 필요 없다.

## 2. 웹 카카오 로그인: `POST /auth/kakao/web`

네이티브는 카카오 SDK 가 발급한 access token 을 보낸다. 웹은 SDK 가 없어 access token 을 만들 수 없고,
카카오가 redirect 로 돌려준 **authorization code** 를 서버가 교환해야 한다
([카카오 로그인 REST API](https://developers.kakao.com/docs/ko/kakaologin/rest-api)).

요청은 `kakaoWebLoginSchema` — `{ code, redirectUri }`. 응답은 `webSocialLoginResultSchema` 로,
`socialLoginResultSchema` 에서 `refreshToken` 을 뺀 것이다.

### 2.1 처리 흐름

```
code + redirectUri
  → KakaoAuthClient.exchangeAuthorizationCode()   신규 port (kauth.kakao.com/oauth/token)
  → { kakaoAccessToken }
  → KakaoVerifier.verifyAccessToken()             기존 port 재사용 (app_id 대조 포함)
  → accounts.findOrCreateBySocial()               기존
  → startSession()                                기존
```

교환한 access token 을 **네이티브와 같은 `loginWithKakao` 로 넘긴다.** HTTP 왕복이 한 번 늘지만,
app_id 대조와 계정 생성 경로가 하나로 유지되어 같은 카카오 계정이면 웹으로 들어오든 앱으로 들어오든
같은 사용자가 된다. 이 불변식은 `auth.service.spec.ts` 의
"같은 카카오 계정이면 네이티브 로그인과 같은 사용자다" 로 고정한다.

code 교환을 기존 `KakaoVerifier` 에 메서드로 추가하지 않고 **별도 port** 로 둔 이유는 ISP 다 —
네이티브 로그인은 code 교환을 알 필요가 없고, 기존 port 를 바꾸면 이를 stub 으로 교체하는
e2e 4개가 함께 깨진다.

### 2.2 redirect uri 허용목록

`KAKAO_WEB_REDIRECT_URIS` 에 등록한 값과 **정확히 일치**해야 교환을 시도한다. 일치하지 않으면
카카오를 호출하기 전에 400 으로 끊는다 — 임의 주소로 code 를 교환하려는 요청을 상류까지 보내지 않는다.
env 검증 단계에서 http·https 스킴만 허용해 `javascript:` 같은 값이 목록에 들어가지 못하게 한다.

### 2.3 실패 매핑

| 상황                               | 응답 |
| ---------------------------------- | ---- |
| 허용목록에 없는 `redirectUri`      | 400  |
| 만료·재사용 code (`invalid_grant`) | 401  |
| 그 밖의 카카오 오류·장애·비-JSON   | 502  |
| `KAKAO_WEB_*` 미설정               | 503  |

상류 응답의 `error_description` 과 본문은 요청 파라미터를 되울릴 수 있으므로 진단에 쓰지 않는다.
짧은 `error` 코드만 메시지에 담는다 — REST 키가 에러로 새지 않는 것을 adapter spec 이 고정한다.

## 3. 세션 쿠키 설계

웹은 refresh token 을 안전하게 둘 곳이 없다. localStorage 는 XSS 에 그대로 노출되므로
**HttpOnly 쿠키로만** 내려보내고 응답 본문에서는 제거한다.

```
Set-Cookie: tripic_rt=<opaque>; HttpOnly; Secure; SameSite=Lax; Path=/
```

### 3.1 `Path=/` 인 이유

브라우저가 보는 URL 은 `https://<웹 호스트>/api/auth/refresh/web` 이지 API 서버 주소가 아니다.
Vercel rewrite 와 Vite proxy 는 업스트림 `Set-Cookie` 를 그대로 전달하며 `Path` 를 재작성하지 않는다.

- `Path=/auth` → 브라우저가 저장은 하지만 `/api/auth/...` 요청에 **싣지 않는다.**
  로컬에서 증상이 안 보이고 운영에서 "리프레시가 조용히 안 됨" 으로 나타난다.
- `Path=/api/auth` → 브라우저에선 동작하지만 웹의 프록시 프리픽스를 API 서버에 하드코딩하는 계층 위반이고,
  네이티브·직접 호출자에겐 틀린 값이다.

### 3.2 `Domain` 미지정인 이유

host-only 쿠키여야 한다. `Domain` 을 주면 브라우저가 보는 호스트(Vercel·localhost)와 불일치해
쿠키가 **폐기된다.**

### 3.3 `Secure` 하드코딩

환경별로 보안 플래그를 다르게 두지 않는다. Chrome·Firefox 는 `http://localhost` 를 secure context 로
취급하므로 로컬 개발에 지장이 없다. Safari 는 거부할 수 있으니 **로컬 로그인 검증은 Chrome 기준**으로
하고, Safari 가 필요하면 웹에서 `vite --https` 를 쓴다.

### 3.4 CSRF

ambient authority(쿠키)를 새로 도입하므로 검토가 필요하다.

- `SameSite=Lax` 가 크로스사이트 POST 에 쿠키를 싣지 않으므로 `/auth/refresh/web` CSRF 가 차단된다.
- CORS 헤더를 내보내지 않으므로 공격자 페이지는 응답 본문(access token)을 읽을 수 없다.
- 강제 rotation 이 일어나더라도 같은 브라우저의 쿠키가 함께 갱신되어 피해자 세션이 끊기지 않는다.

→ **별도 CSRF 토큰을 도입하지 않는다.** 프록시를 걷어내고 cross-origin 으로 전환하면
`SameSite=None` 이 강제되어 이 분석이 무효가 되므로, 그때 다시 검토해야 한다.

### 3.5 회전·로그아웃

- `POST /auth/refresh/web` — 쿠키에서 읽어 기존 `AuthService.refresh` 로 rotation 한다.
  재사용 감지 시 family 전체 revoke 라는 의미가 body 방식과 동일하게 유지된다.
  실패하면 **쿠키를 지운 뒤** 401 을 던진다 — 죽은 쿠키를 남기면 웹이 같은 토큰으로 무한 재시도한다.
- `POST /auth/logout/web` — Bearer 로 인증하고 쿠키의 토큰 family 를 revoke 한다.
  쿠키 유무와 관계없이 지우고 204 로 끝낸다(멱등). 소유권 검사는 `AuthService.logout` 이 그대로 한다.
- 두 방식은 **같은 저장소를 공유한다.** 네이티브가 받은 refresh token 을 쿠키에 담아도 회전된다.

## 4. TourAPI 서버 프록시

후속 작업이다. 웹에서 관광공사 API 를 직접 호출하면 CORS 로 실패하고 인증키가 노출되므로
서버 프록시가 필요하다. 착수 전 [apps/api/CLAUDE.md](../apps/api/CLAUDE.md) 의
"KTO 원천 데이터를 수신/저장하지 않는다" 원칙 개정이 선행되어야 한다.

## 5. 환경 변수

| 변수                      | 용도                                            | 필수         |
| ------------------------- | ----------------------------------------------- | ------------ |
| `KAKAO_WEB_REST_API_KEY`  | authorization code 교환용 카카오 REST API 키    | 둘이 한 묶음 |
| `KAKAO_WEB_REDIRECT_URIS` | 쉼표 구분 redirect uri 허용목록 (http·https 만) | 둘이 한 묶음 |
| `KAKAO_WEB_CLIENT_SECRET` | 카카오 콘솔에서 Client Secret 을 켠 경우에만    | 선택         |

**REST API 키는 `KAKAO_APP_ID` 와 같은 카카오 애플리케이션의 것이어야 한다.** 다른 앱의 키를 넣으면
교환한 토큰이 `access_token_info` 의 app_id 대조에서 걸려 **운영에서만 401** 이 난다.
단위 테스트로는 잡히지 않으므로 스테이징에서 실제 카카오 계정 로그인 1회로 확인한다.

템플릿: [apps/api/.env.example](../apps/api/.env.example)

### 5.1 웹 카카오 로그인 미설정 모드

`KAKAO_WEB_*` 을 전부 비우면 `DisabledKakaoWebLoginAdapter` 가 붙어 `POST /auth/kakao/web` 만 503 이 되고
서버는 정상 기동한다. 네이티브 `/auth/kakao` 와 쿠키 회전·로그아웃은 영향받지 않는다
(쿠키 경로는 code 교환 port 를 타지 않는다). `test/kakao-web-disabled.e2e-spec.ts` 가 이를 고정한다.

## 6. 카카오 개발자 콘솔 설정 (runbook)

- 웹 플랫폼 도메인 등록 — 운영 웹 도메인, 로컬 개발 도메인
- Redirect URI 등록 — `KAKAO_WEB_REDIRECT_URIS` 와 **정확히 일치**해야 한다
  - 예: `https://웹도메인/auth/kakao/callback`, `http://localhost:5173/auth/kakao/callback`
- Client Secret 을 켰다면 `KAKAO_WEB_CLIENT_SECRET` 에 넣는다

## 7. 웹 담당자에게 전달할 계약

1. **사진은 `<img src>` 로 못 부른다.** `GET /records/.../photos/:id` 는 전역 guard 하에 있고 브라우저는
   이미지 요청에 `Authorization` 을 붙이지 않는다. `fetch` + Bearer → `blob:` object URL 로 받고
   화면에서 내릴 때 `revokeObjectURL` 한다.
2. 새로고침 복구는 `POST /auth/refresh/web` 이다. 본문 없이 쿠키만으로 호출한다.
3. 프록시(Vercel rewrite · Vite proxy)가 `Set-Cookie` 를 재작성하지 않아야 한다.
4. 로컬 로그인 검증은 Chrome 기준(§3.3).

## 8. 체크리스트

- [x] `POST /auth/kakao/web` — code 교환 + 쿠키 발급
- [x] `POST /auth/refresh/web` — 쿠키 rotation, 실패 시 쿠키 삭제
- [x] `POST /auth/logout/web` — family revoke + 쿠키 삭제 (멱등)
- [x] 미설정 모드 — 웹 로그인만 503, 네이티브 영향 없음
- [x] 기존 네이티브 경로 회귀 테스트
- [ ] 스테이징에서 실제 카카오 계정 로그인 1회 (§5 — app_id 불일치는 여기서만 드러난다)
- [ ] Vercel preview 에서 로그인 → 새로고침 → refresh 왕복 (§3.1 — 프록시 경유 쿠키는 e2e 로 재현 불가)
- [ ] TourAPI 프록시 (§4)
