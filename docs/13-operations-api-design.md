# 운영 API 응답 계약 (app-config · notices · version) + 법무 페이지 이관

| 항목 | 내용                                                                                |
| ---- | ----------------------------------------------------------------------------------- |
| 상태 | **구현 완료** — 3종 모두 이 계약대로 정적 서빙 중 (`src/<module>/<module>.data.ts`) |
| 근거 | PRD 14.2 (비위치성 운영 API), [06-architecture.md](./06-architecture.md)            |
| 원칙 | **DB 불필요** — 코드 상수로 서빙하되 app-config 값은 환경변수로 덮을 수 있다        |

---

## 1. 원칙

- 운영 데이터는 원격이어야 의미가 있지만(버전 강제·긴급 공지·릴리스 없는 설정 조정) **DB는
  필요 없다** — 서버 상수/JSON으로 두고 값 변경은 배포로 처리한다. 규모가 생기면 어드민+DB로
  이관한다.
- 서버 제공은 version·app-config·notices **JSON 3종**. 약관/처리방침은 서버 미제공 —
  앱 번들로 표시하고, 심사용 공개 URL은 **외부 Notion 페이지**로 확보한다 (아래 참고).
- 전부 `@Public()` (인증 불필요), 캐시 허용 (`Cache-Control: public, max-age=300` — 구현됨).
- JSON 응답의 계약 타입은 `@tripic/shared`에 두어 앱과 공유한다.

## 2. 엔드포인트 명세

### GET /version — 앱 최소 지원 버전

```jsonc
// 200 — 현재 응답 (스토어 미등록이라 updateUrl 생략)
{
  "minSupportedVersion": "1.0.0", // semver — 미만이면 앱이 강제 업데이트 안내
  "latestVersion": "1.0.0",
}
// 스토어 등록 후 추가할 필드
{
  "updateUrl": {
    "android": "https://play.google.com/store/apps/details?id=...",
    "ios": "https://apps.apple.com/app/...",
  },
}
```

### GET /app-config — 앱 동작 설정 (비위치성)

PRD 6.4의 후보 조회 기준을 릴리스 없이 조정할 수 있게 원격화한다.

```jsonc
// 200
{
  "kto": {
    "defaultRadiusM": 300, // 기본 검색 반경 (PRD 6.4)
    "maxRadiusM": 1000, // 확장 반경
    "maxCandidates": 5, // 후보 최대 노출 수
  },
  "features": {
    "aiDiary": false, // AI 일기 생성 — 비용을 이유로 구현하지 않기로 결정 (docs/11 §3.2)
    "photoUpload": true, // 사진 업로드 — 업로드·서빙·삭제 API 구현 완료 (docs/11 §3.1)
  },
}
```

기능 플래그는 **해당 서버 API 가 실제로 존재할 때** `true` 로 뒤집는다 — 없는 엔드포인트를 앱이
노출하지 않게 막는 것이 이 스위치의 목적이다. 앱이 아직 그 API 를 쓰지 않더라도, 붙이는 시점에
서버를 다시 배포하지 않도록 API 존재 여부만 반영한다.

**환경변수로 덮을 수 있다** — 위 다섯 값은 코드에 기본값을 두되 환경변수가 있으면 그쪽을 쓴다.
반경을 조정할 때 코드 수정·태그·재배포 대신 값만 바꾸고 재시작하면 된다.

| 환경변수               | 기본값  |
| ---------------------- | ------- |
| `KTO_DEFAULT_RADIUS_M` | `300`   |
| `KTO_MAX_RADIUS_M`     | `1000`  |
| `KTO_MAX_CANDIDATES`   | `5`     |
| `FEATURE_AI_DIARY`     | `false` |
| `FEATURE_PHOTO_UPLOAD` | `true`  |

잘못된 값은 **부팅 시점에 막는다** — 운영 중 이상한 설정이 앱으로 흘러가지 않도록
`ConfigModule.validate` 에서 검증한다.

- 반경·후보 수: 양의 정수만 (`0`, 음수, 소수, `300m` 같은 단위 표기는 거부)
- 플래그: **`true` / `false` 만** — `on`·`yes`·`1`·`True` 는 모두 거부한다.
  여러 표기를 받아주면 배포마다 표기가 갈리고 값을 읽는 쪽이 매번 해석해야 하므로 하나로 고정했다.

### GET /notices — 공지 목록

```jsonc
// 200 — publishedAt 내림차순
[
  {
    "id": "2026-08-service-open",
    "title": "서비스 오픈 안내",
    "body": "…", // plain text 또는 markdown
    "publishedAt": "2026-08-26T00:00:00.000Z",
  },
]
```

### 약관/처리방침 — 서버 제공 안 함

- **앱 내 표시**: 앱 번들 HTML/텍스트로 처리한다 (원격 조달 불필요).
- **심사용 공개 URL**: **외부 Notion 공개 페이지로 확정** — 스토어 심사는 활성 URL의
  처리방침 제출이 필수이므로
  ([Play Console 요건](https://support.google.com/googleplay/android-developer/answer/9859455?hl=ko))
  처리방침·약관 Notion 페이지를 만들어 심사 폼·카카오 디벨로퍼스에 제출한다.
  출시 전 페이지가 **전체 공개·지역 제한 없음·방문자 수정 불가** 상태인지 확인한다.

처리방침 본문에는 [12-location-law.md](./12-location-law.md) §2-3과 사진 선택 동의
([11-records-api-design.md](./11-records-api-design.md) §3.1), 그리고 **AI 일기 생성 시
관광지명·메모의 LLM(제3자) 제공** — 제공자·목적·보관 정책 포함
([11-records-api-design.md](./11-records-api-design.md) §3.2)을 반영한다.

**설정 화면(Figma 46:1245) 대조**:

- "개인정보 처리방침" 항목 → 앱 번들 페이지를 열거나 Notion 공개 URL을 브라우저로 연다.
- "위치 정보 활용 안내"·"EXIF 사용 안내" → 앱 내장 정적 텍스트로 충분 (원격 조달 불필요 —
  변경 시 앱 릴리스로 갱신).
- 약관은 설정 화면에 노출되지 않지만 **심사 제출·가입 동의 링크용** Notion 페이지를 함께 준비한다.
- "기록 데이터 삭제"·"전체 기록 초기화" → [11-records-api-design.md](./11-records-api-design.md)의
  `DELETE /records/:id` · `DELETE /records`(벌크)로 대응.

## 3. 에러 규약

- 정적 서빙이라 3종 모두 실패 케이스가 사실상 없다 — 5xx는 서버 장애뿐.
- 앱은 `/version` 실패 시 차단하지 않고 통과시킨다 (강제 업데이트는 성공 응답에서만 판단).

## 4. 구현 메모

- 헥사고날 적용은 과설계 — 컨트롤러가 상수 모듈(`src/<module>/<module>.data.ts`)을 직접 반환한다
  (외부 I/O가 없으므로 port 불필요, apps/api/CLAUDE.md 원칙과 상충하지 않음).
- zod 스키마보다 **응답 타입**(`@tripic/shared`의 `VersionInfo`·`AppConfig`·`Notice`)이 계약의
  본체다 (요청 본문이 없으므로).
- 스토어 URL 등 미확정 값은 빈 문자열이 아니라 **필드 생략(optional)** 으로 둔다 — 현재
  `/version` 응답에 `updateUrl`이 없다.
- `app-config`의 `kto` 기본값은 앱과 공유하는 상수(`DEFAULT_RADIUS_M`·`EXPANDED_RADIUS_M`·
  `MAX_CANDIDATES`)와 같은 값을 env 스키마의 기본값으로 두고, 환경변수가 있으면 그쪽을 쓴다.
- 공지 배열은 데이터 모듈에서 `publishedAt` 내림차순 정렬을 보장한다 (컨트롤러는 정렬하지 않음).
