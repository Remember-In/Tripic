# 웹 클라이언트 지원 서버 설계

| 항목      | 내용                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------ |
| 상태      | §2·§3·§4 구현 완료                                                                                     |
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
Set-Cookie: tripic_rt=<opaque>; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax; Path=/
```

`Max-Age` 는 `JWT_REFRESH_TTL_DAYS` 와 같다. **생략하면 세션 쿠키가 되어 브라우저를 닫을 때 사라지고**,
DB 의 refresh token 은 30일 살아 있는데 쿠키만 먼저 죽어 "로그인 유지" 가 깨진다
(revoke 되지 않은 토큰 행만 남는다).

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
  **토큰이 죽은 경우(401)에만 쿠키를 지운다** — 죽은 쿠키를 남기면 웹이 같은 토큰으로 무한 재시도하지만,
  반대로 DB 장애 같은 일시 오류(500)에서 지우면 아직 살아 있는 토큰을 버려 재시도로 복구할 수 있는
  상황을 영구 로그아웃으로 만든다. 이 판단은 `shouldClearRefreshCookie` 한 곳에 모아 단위 테스트로 고정한다.
- `POST /auth/logout/web` — Bearer 로 인증하고 쿠키의 토큰 family 를 revoke 한다.
  쿠키 유무와 관계없이 지우고 204 로 끝낸다(멱등). 소유권 검사는 `AuthService.logout` 이 그대로 한다.
- 두 방식은 **같은 저장소를 공유한다.** 네이티브가 받은 refresh token 을 쿠키에 담아도 회전된다.

## 4. TourAPI 서버 프록시

### 4.1 왜 필요한가

- `apis.data.go.kr` 은 CORS 헤더를 주지 않아 **브라우저에서 직접 호출하면 전부 실패**한다.
  네이티브는 CORS 개념이 없어 지금까지 직접 호출로 충분했다.
- 웹 번들에 서비스키를 넣으면 네트워크 탭에 그대로 노출된다. 공공데이터포털 키는 일일 쿼터가 있어
  도용되면 서비스가 멈춘다. 키는 서버 환경변수에만 둔다.

### 4.2 경계 — GPS 는 프록시하지 않는다

**키워드 검색·지역 검색·상세·이미지·지역목록만 중계하고, 좌표 기반 주변검색은 제공하지 않는다.**

이건 편의상의 범위 조정이 아니라 **법적 전제**다. [12-location-law.md](./12-location-law.md) §3 의
신고 불요 판단은 "좌표가 사업자의 위치정보시스템으로 전송되지 않는다"에 기대고 있다(②). 프록시가
좌표를 받는 순간 그 판단 구조가 바뀌고, 개인정보 처리방침([08-privacy-risk.md](./08-privacy-risk.md))의
"GPS 가 Tripic 백엔드에는 전송되지 않는다"는 고지도 사실과 어긋난다.

**"저장하지 않으니 괜찮다"는 성립하지 않는다.** 공식 FAQ 9 원문(docs/12 §1.3 인용):

> 위치정보가 저장되지 않고 해당 서버에서 즉시 삭제된다고 하더라도, 사업자 서버로 위치정보가
> 이미 '전송'된 경우이므로 위치기반서비스사업 신고 대상에 해당

즉 pass-through 라는 성질은 KTO **응답** 데이터에는 면죄부가 되지만(저장 금지 원칙을 지키면 된다),
**좌표에는 되지 않는다.** 좌표는 서버에 닿는 것 자체가 기준선이다.

> 프록시에 좌표 파라미터를 추가하려면 docs/12 §3 재검토와 처리방침 개정이 **먼저** 필요하다.
> 웹의 장소 선택은 사용자가 직접 검색하는 흐름으로 충족한다.

네이티브의 GPS 주변검색은 지금처럼 **단말에서 KTO 를 직접 호출**하는 구조를 유지한다 — 이 PR 은
그 경로를 건드리지 않는다.

### 4.3 pass-through 원칙

- 응답을 **DB·캐시·로그 어디에도 남기지 않는다.** 서버에 캐시 계층을 두지 않는다는 기존 원칙과 같고,
  "KTO 원천 데이터를 저장하지 않는다"는 제약도 그대로 지켜진다.
- 저장하지 않으므로 [08-privacy-risk.md](./08-privacy-risk.md) 의 "관광공사 데이터 로컬 저장 →
  OpenAPI 실시간 호출 유지" 완화책과도 어긋나지 않는다.
- 인증을 요구한다(`@Public()` 을 붙이지 않는다) — 서비스키 쿼터를 익명 호출에 열어두지 않기 위해서다.

### 4.4 라우트

```
GET /tourism/areas
GET /tourism/places?keyword=&limit=                 키워드 검색
GET /tourism/places?areaCode=&sigunguCode=&limit=   지역 검색
GET /tourism/places/:contentId
GET /tourism/places/:contentId/images
```

`keyword` 와 `areaCode` 는 **배타적**이다 — 둘 다 오거나 둘 다 없으면 400. `/places/search` 처럼
라우트를 나누지 않은 이유는 `:contentId` 와 선언 순서에 의존하는 모호성이 생기기 때문이고,
단일 라우트에 XOR refine 을 걸면 그 모호성이 원천 제거된다. `limit` 은 1..50, 기본 5.
`contentId` 는 숫자 형식만 통과한다(아니면 400).

실패 매핑: 상류 오류 → 502, 타임아웃 → 504, 결과 없음(상세) → 404, 미설정 → 503.

### 4.5 원칙 문구 개정

[apps/api/CLAUDE.md](../apps/api/CLAUDE.md) 와 `app.module.ts` 의 금지 문구가 기존에는
"GPS 좌표·EXIF 원본·**KTO 원천 데이터**를 수신/저장하지 않는다"였다. pass-through 프록시는 저장은
안 하지만 수신은 하므로, 다음과 같이 둘을 분리했다.

- GPS·EXIF: **수신/저장 모두 금지** (변경 없음 — 법적 전제)
- KTO 원천 데이터: **저장 금지** (수신은 pass-through 에 한해 허용)

## 5. 환경 변수

| 변수                      | 용도                                                  | 필수         |
| ------------------------- | ----------------------------------------------------- | ------------ |
| `KAKAO_WEB_REST_API_KEY`  | authorization code 교환용 카카오 REST API 키          | 둘이 한 묶음 |
| `KAKAO_WEB_REDIRECT_URIS` | 쉼표 구분 redirect uri 허용목록 (http·https 만)       | 둘이 한 묶음 |
| `KAKAO_WEB_CLIENT_SECRET` | 카카오 콘솔에서 Client Secret 을 켠 경우에만          | 선택         |
| `KTO_SERVICE_KEY`         | TourAPI 프록시 서비스키 (비우면 `/tourism` 만 비활성) | 선택         |

**REST API 키는 `KAKAO_APP_ID` 와 같은 카카오 애플리케이션의 것이어야 한다.** 다른 앱의 키를 넣으면
교환한 토큰이 `access_token_info` 의 app_id 대조에서 걸려 **운영에서만 401** 이 난다.
단위 테스트로는 잡히지 않으므로 스테이징에서 실제 카카오 계정 로그인 1회로 확인한다.

템플릿: [apps/api/.env.example](../apps/api/.env.example)

### 5.1 웹 카카오 로그인 미설정 모드

`KAKAO_WEB_*` 을 전부 비우면 `DisabledKakaoWebLoginAdapter` 가 붙어 `POST /auth/kakao/web` 만 503 이 되고
서버는 정상 기동한다. 네이티브 `/auth/kakao` 와 쿠키 회전·로그아웃은 영향받지 않는다
(쿠키 경로는 code 교환 port 를 타지 않는다). `test/kakao-web-disabled.e2e-spec.ts` 가 이를 고정한다.

### 5.2 TourAPI 미설정 모드

`KTO_SERVICE_KEY` 를 비우면 `DisabledTourApiAdapter` 가 붙어 `/tourism/*` 만 503 이 되고 서버는 정상
기동한다. 인증(401)과 형식 검증(400)은 503 보다 먼저 걸리므로, 미설정이라는 사실이 비인증자에게
드러나지 않는다. `test/tourism-disabled.e2e-spec.ts` 가 이를 고정한다.

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
- [x] KTO 데이터 취급 원칙 개정 — GPS·EXIF(수신/저장 금지)와 KTO(저장 금지) 분리 (§4.4)
- [x] TourAPI 프록시 구현 (§4) — 좌표 파라미터 없이
- [ ] 스테이징에서 실제 서비스키로 `/tourism/places?keyword=` 1회 호출 (쿼터·키 형식은 여기서만 드러난다)
- [ ] 웹 개인정보 처리방침에 "관광지 검색이 Tripic 서버를 거친다(저장하지 않음)" 반영 — 기획 담당
