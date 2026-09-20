# 여행 기록 콘텐츠 API 설계 (P1)

| 항목 | 내용                                                                                                     |
| ---- | -------------------------------------------------------------------------------------------------------- |
| 상태 | **콘텐츠 + 사진 API 구현 완료** (Prisma 어댑터) · AI 생성은 미도입 결정(§3.2) · 방문 관광지는 검토 대기  |
| 근거 | [10-auth-db-design.md](./10-auth-db-design.md) §4·§9, Figma 기록 생성 / AI 기록 생성 설정 / 내 여행 기록 |
| 범위 | 기록의 **콘텐츠 부분만** — 제목·테마·문체·해시태그·날짜별 일기                                           |
| 제외 | 방문 관광지(record_places) API — **위치정보지원센터 사전 검토 후** 별도 설계·노출 (§6)                   |

---

## 1. 범위와 원칙

여행 기록을 법적 성격이 다른 두 부분으로 나눈다.

- **콘텐츠 부분 (이 문서)**: 제목, 테마, 문체, 해시태그, 날짜별 일기 본문.
  블로그 글과 같은 일반 사용자 콘텐츠로 위치정보법 대상이 아니다 → 바로 서버 저장/노출 가능.
- **방문 관광지 부분 (제외)**: KTO contentId + 방문일 + 지역코드(record_places).
  "장소+시간" 결합이라 위치정보지원센터 사전 검토 후 노출한다 (docs/10 §9).

구분의 법적 근거(위치정보법 제2조 '측위' 요건, 직접 입력 정보 = 개인정보)와 데이터 흐름별
판단은 [12-location-law.md](./12-location-law.md) 참고.

모든 엔드포인트는 Bearer 인증 필수이며 **본인 소유 기록만** 다룬다.
타인의 기록은 존재 자체를 숨긴다 — 403이 아니라 **404**로 응답한다.

## 2. 단계 계획

| Phase | 내용                                                                                                     | 게이트                |
| ----- | -------------------------------------------------------------------------------------------------------- | --------------------- |
| 1~2   | 계약(@tripic/shared zod) 확정 + **Prisma adapter** 로 엔드포인트 동작 — **완료** (in-memory 단계는 생략) | 없음 — 완료           |
| 3     | record_places API(장소 추가/지역별 조회/지도 스탬프 집계) 설계·추가                                      | 위치정보지원센터 검토 |

Phase 1의 목적: 모바일이 안정된 계약으로 즉시 개발을 시작할 수 있게 한다.
헥사고날 구조(apps/api/CLAUDE.md)라 adapter 교체 시 controller/service는 무변경이다.

**구현 시 결정**: Phase 1(in-memory)을 건너뛰고 **바로 Prisma adapter로 간다**. records·entries
테이블이 이미 마이그레이션돼 있어 in-memory 단계의 실익이 없고, 서버가 모바일보다 먼저 붙는
상황이라 "계약만 먼저 열어둔다"는 목적도 사라졌다. Phase 3(record_places) 게이트는 그대로다.

## 3. 엔드포인트 명세

| Method | Path                                      | 성공 | 설명                                                                               |
| ------ | ----------------------------------------- | ---- | ---------------------------------------------------------------------------------- |
| POST   | `/records`                                | 201  | 기록 생성                                                                          |
| GET    | `/records`                                | 200  | 내 기록 목록 (여행일 최근순 — 아래 정렬 규칙)                                      |
| GET    | `/records/:id`                            | 200  | 상세 — 일차(날짜)별 일기·사진 (날짜 오름차순)                                      |
| PATCH  | `/records/:id`                            | 200  | 제목/테마/문체/해시태그 부분 수정                                                  |
| DELETE | `/records/:id`                            | 204  | 기록 **즉시 영구 삭제** (일기·사진 cascade)                                        |
| DELETE | `/records`                                | 204  | **내 기록 전체 즉시 영구 삭제** (설정 "전체 기록 초기화" 대응 — 확인 UX는 앱 책임) |
| PUT    | `/records/:id/days/:date/entry`           | 200  | 날짜별 일기 작성/수정 (upsert)                                                     |
| DELETE | `/records/:id/days/:date/entry`           | 204  | 날짜별 일기 **즉시 영구 삭제**                                                     |
| POST   | `/records/:id/days/:date/photos`          | 201  | 해당 일차에 EXIF 제거 사본 사진 업로드 (§3.1)                                      |
| GET    | `/records/:id/days/:date/photos/:photoId` | 200  | 사진 바이너리 서빙                                                                 |
| DELETE | `/records/:id/days/:date/photos/:photoId` | 204  | 사진 **즉시 영구 삭제**                                                            |

URL은 **일차(day) 기준**으로 통일한다 — 일기(entry)와 사진(photos)은 형제 관계이므로 둘 다
`/days/:date` 아래에 둔다 (상세 응답의 `days[]` 구조와 1:1).

위 엔드포인트는 모두 구현돼 동작한다. 상세 응답의 일차는 **일기와 사진의
날짜를 합집합**으로 만들어지므로 사진만 있는 일차도 나온다 (그때 `entry` 는 null).

**삭제 정책 — 전면 hard delete**: 기록·일기·사진은 물론 **회원 탈퇴를 포함해 모든 삭제는
지체 없는 물리 삭제**다 (PRD "삭제된 기록은 복구하지 않는다" 및 개인정보보호법의 지체 없는
파기 원칙과 일치). 탈퇴는 `users` 행 삭제 → FK cascade 로 소셜 계정·토큰·기록·일기·사진까지
일괄 파기된다 — [docs/10 §3](./10-auth-db-design.md). soft delete 는 사용하지 않는다
(스키마의 `status`/`deletedAt` 은 마이그레이션 `drop_soft_delete` 로 제거 완료). 백업본에는 보관 주기 동안 잔존할 수
있음을 처리방침에 고지한다.

### POST /records — 기록 생성

```jsonc
// 요청
{
  "title": "경주 여행",           // 필수, trim 1–50자
  "theme": "NATURE_SCENERY",      // 선택 — 테마 enum (§4)
  "style": "EMOTIONAL_ESSAY",     // 선택 — 문체 enum (§4)
  "hashtags": ["#경주", "#가족"]  // 선택, 최대 10개 (각 trim 1–30자), 기본 []
}
// 201 응답 — RecordSummary
{
  "id": "0192…",
  "title": "경주 여행",
  "theme": "NATURE_SCENERY",
  "style": "EMOTIONAL_ESSAY",
  "hashtags": ["#경주", "#가족"],
  "entryCount": 0,
  "startDate": null, // 일기·사진이 있는 날짜의 min (YYYY-MM-DD) — 목록 카드의 "2026.07.22-23" 표시용
  "endDate": null,   // max — 둘 다 없으면 null
  "coverPhoto": null, // 목록 카드 썸네일 — 사진이 없으면 null
  "createdAt": "2026-08-21T12:00:00.000Z",
  "updatedAt": "2026-08-21T12:00:00.000Z"
}
```

`coverPhoto`는 **가장 이른 일차의 가장 먼저 올린 사진**이다 (`{ id, url }`). `RecordPhoto.id`가
`uuid(7)`(시간 정렬)이라 `(date, id)` 오름차순의 첫 행이 곧 그 의미이고, 상세 응답의 사진 순서와
같은 규칙을 쓴다. 추가 쿼리 없이 기존 `include` 에 사진 id 를 얹어 계산하며 **바이트(bytea)는 읽지 않는다.**

> 웹 주의: `coverPhoto.url` 은 인증이 필요한 경로라 `<img src>` 로 바로 부를 수 없다.
> `fetch` + Bearer → `blob:` object URL 로 받아야 한다 ([15](./15-web-client-server-design.md) §7).

### GET /records — 내 기록 목록

`RecordSummary[]` — 정렬은 **여행일 기준 최근순**: `endDate` 내림차순, `endDate`가 null이면
`createdAt`으로 대체. Figma "내 여행 기록" 최근순 탭(카드에 제목 + "2026.07.22-23" 날짜 범위
표시)과 일치한다 — 날짜 범위는 `startDate`/`endDate`로 렌더링.
(지역 탭·지역별 필터는 record_places 소관이라 Phase 3에서 추가한다. 페이지네이션은 기록 수가
문제되기 전까지 도입하지 않는다 — 필요 시 cursor 방식으로 확장.)

### GET /records/:id — 상세

```jsonc
// 200 응답 — RecordDetail (RecordSummary 에서 entryCount 대신 days)
{
  "id": "0192…",
  "title": "경주 여행",
  "theme": "NATURE_SCENERY",
  "style": "EMOTIONAL_ESSAY",
  "hashtags": ["#경주"],
  "days": [
    // 일차(날짜) 오름차순 — Figma 상세 화면의 "1일차 2026.07.22" 그룹과 1:1.
    // 일기(entry)와 사진(photos)은 date 를 공유하는 형제 관계 — 일기 없이 사진만 있는 일차도 가능
    {
      "date": "2026-08-15",
      "entry": {
        // 없으면 null
        "content": "석양이 물드는 안압지를 걸었다.",
        "source": "USER", // USER | AI — 앱이 보낸 값을 그대로 저장한다. 서버는 AI 생성을 하지 않는다 (§3.2)
        "createdAt": "2026-08-21T12:10:00.000Z",
        "updatedAt": "2026-08-21T12:10:00.000Z",
      },
      "photos": [
        {
          "id": "0193…",
          "url": "/records/0192…/days/2026-08-15/photos/0193…",
        },
      ],
    },
  ],
  "createdAt": "2026-08-21T12:00:00.000Z",
  "updatedAt": "2026-08-21T12:10:00.000Z",
}
```

### PATCH /records/:id — 부분 수정

모든 필드 선택. `theme`/`style`은 `null`을 보내면 해제한다.

```jsonc
// 요청 (예: 문체 변경 + 테마 해제)
{ "title": "경주 2박3일", "theme": null, "style": "FRIEND_CHAT" }
// 200 응답 — RecordSummary
```

### PUT /records/:id/days/:date/entry — 일기 upsert

`:date`는 `YYYY-MM-DD`. 같은 날짜에 다시 쓰면 교체된다 (DB `UNIQUE(recordId, date)`와 일치 — 하루 1편).

```jsonc
// 요청
{ "content": "첫째 날 일기…", "source": "USER" } // content trim 1–5000자
// 200 응답 — 상세 응답 days[].entry 와 동일 shape
```

### 3.1 사진 업로드 (PoC 채택) — 일차(날짜) 소속

기기 변경 시 기록↔사진 복원을 위해 **EXIF 제거 사본**을 서버에 저장한다 (PRD가 허용한 경로,
법적 판단은 [12-location-law.md](./12-location-law.md) §3-⑥).

**소속 모델**: Figma 기록 생성·상세 화면 모두 사진이 "N일차" 그룹 아래에 붙으므로, 사진은
기록이 아니라 **일차(날짜) 소속**이다. 다만 일기 없이 사진만 있는 일차가 존재하므로 사진은
entry FK가 아닌 **(recordId, date)를 직접 갖는다** — entry와 date를 공유하는 형제 관계
(`UNIQUE(recordId, date)` 제약은 entry에만 적용). 스키마: `record_photos(id, recordId FK,
date, data bytea, mimeType, size, createdAt)` — 마이그레이션 `add_record_photos` 로 반영 완료.

**구현 결과 (확정 수치)**:

- 업로드는 `multipart/form-data` 의 `photo` 필드. 스트림 단계에서 **1MB** 로 자른다.
- 검증은 sharp(libvips) 로 실제 디코딩해 포맷(jpeg/webp)·크기를 확인하고,
  `exif`·`xmp`·`iptc`·`icc` 가 하나라도 있으면 **400**(`photo rejected: HAS_METADATA`).
- 디코딩 폭탄 방어는 `limitInputPixels`(4096×4096) + 변 길이 4096px 제한.
- 할당량: 파일당 1MB, **기록당 20장**, **사용자 총 100MB** — 초과 시 **413**.
  할당량은 디코딩 **전에** 검사해 한도 초과 요청에 CPU 를 쓰지 않는다.
- 서빙은 `Content-Type` + `X-Content-Type-Options: nosniff` + `Cache-Control: private, max-age=300`.
  Bearer 인증이 필요하므로 앱은 `<img src>` 가 아니라 fetch 로 받아 렌더링한다.
- 상세 응답은 사진 바이트를 싣지 않는다 — `id` 와 서빙 `url` 만 내려간다.

**서버 밖의 약속** (위 구현 결과에 담기지 않는 부분):

- **클라이언트**: 디코드 → 리사이즈 → **재인코딩**으로 업로드 사본을 만든다 — 재인코딩은 EXIF를
  구조적으로 소멸시켜 "제거 누락" 결함을 원천 차단한다. 서버의 메타데이터 검증은 그 위에 얹는
  이중 안전장치다.
- **저장 위치**: PoC 는 PostgreSQL `bytea`(`record_photos`). 규모가 커지면 오브젝트 스토리지로
  이관하는 경로를 열어둔다 — 응답이 바이트가 아니라 `url` 만 노출하므로 계약 변경 없이 바꿀 수 있다.
- **동의**: 사진 없이도 서비스 이용이 가능하므로 **선택 동의** + 처리방침 항목 명시, 탈퇴·삭제 시
  파기(위 hard delete 정책).

### 3.2 AI 일기 생성 — 미도입 결정

Figma "AI 자동 생성" 버튼에 대응하는 서버 LLM 프록시(`POST /records/:id/days/:date/generate`)는
**비용을 이유로 구현하지 않기로 결정했다.** 이전 설계안(제공자 중립 계약·rate limit·zero-retention
심사)은 폐기한다 — 다시 필요해지면 이 문서를 되살리지 않고 새 설계로 시작한다.

결정에 딸려오는 것들:

- `app-config`의 `features.aiDiary`는 **항상 `false`**로 서빙한다 (docs/13 §2). 계약 필드와
  `FEATURE_AI_DIARY` 환경변수는 앱이 이미 읽고 있으므로 남겨두되, 켜는 시나리오는 없다.
- 일기는 사용자가 직접 작성한다. `EntrySource`의 `AI` 값은 계약에 남지만 **서버가 만들어내지
  않는다** — 앱이 기기 내 생성 등 다른 경로로 채울 여지를 위해 값만 유지한다.
- **관광지명·메모의 서버 일시 처리 예외도 함께 폐기한다.** 서버는 KTO 원천 데이터를 저장하지
  않을 뿐 아니라 **수신도 하지 않는다**는 원래 원칙으로 되돌아간다 (§6, docs/07 §14.2).
- 따라서 LLM 제3자 제공 고지, 요청 본문 로그 마스킹, Play의 AI 생성 콘텐츠 신고 기능 요건은
  **모두 해당 없음**이다 — 개인정보 처리방침과 Data Safety에 적지 않는다.

## 4. Enum (Figma "AI 기록 생성 설정" 화면)

| Enum        | 값                                                                     | 화면 표기                                        |
| ----------- | ---------------------------------------------------------------------- | ------------------------------------------------ |
| RecordTheme | `NATURE_SCENERY` `HISTORY_CULTURE` `FOOD_EXPERIENCE` `REGION_COMPLETE` | 자연・풍경 / 역사・문화 / 음식・체험 / 지역 완주 |
| DiaryStyle  | `DOCU_NARRATION` `EMOTIONAL_ESSAY` `FRIEND_CHAT`                       | 다큐 내레이션체 / 감성 에세이체 / 친구 대화체    |
| EntrySource | `USER` `AI`                                                            | 직접 작성 / AI 작성                              |

DB의 Prisma enum(`apps/api/prisma/schema.prisma`)과 값이 동일하다.

## 5. 검증·에러 규약

- 요청 검증은 `@tripic/shared`의 zod 스키마로 라우트에서 수행한다
  (`createRecordSchema`, `updateRecordSchema`, `upsertEntrySchema`, `entryDateSchema` — 구현 브랜치에서 추가).
- | 상태 | 조건                                                       |
  | ---- | ---------------------------------------------------------- |
  | 400  | zod 검증 실패 (`{ message, issues: [{ path, message }] }`) |
  | 401  | Bearer 없음/무효 (전역 guard)                              |
  | 404  | 없는 기록/일기 **또는 타인의 기록** (소유권 은폐)          |

## 6. Phase 3 예고 — record_places (검토 후)

위치정보지원센터 검토 통과 시 추가할 계약의 방향이다. 상세 API·집계·오류·테스트 계약은
[16-visit-region-api-design.md](./16-visit-region-api-design.md)에 정의한다.

- `POST /records/:id/places` — 사용자가 확정한 KTO `contentId` + 방문일 + 지역/분류 코드만
- `PATCH /records/:id/places/:placeId` · `DELETE /records/:id/places/:placeId` — 기록 상세의
  "방문 정보 수정/추가" UI(Figma) 대응. 대표 수정 케이스는 방문일 변경
- `GET /records?area=…` — 지역별 필터, `GET /map/progress` — 방문 시·군 X/157 집계
- 장소명("수성못")·지역명("대구광역시, 수성구")은 저장하지 않고 화면 표시 시 `contentId`·
  지역코드로 KTO OpenAPI를 실시간 조회해 렌더링한다
- GPS 좌표·EXIF·KTO 원천 데이터(관광지명/주소/이미지)는 **저장하지 않으며, 수신도 하지 않는다**
  — 예외 없음 (AI 일기 생성의 일시 처리 예외는 §3.2 미도입 결정과 함께 폐기됐다)

## 7. 구현 원칙 (apps/api/CLAUDE.md)

- TDD: 서비스 단위 테스트(포트 fake) + e2e(PactumJS) 먼저.
- 헥사고날: `records/ports/records-repository.port.ts`(소유권 필터 `userId`를 port 계약에 포함)
  \+ `adapters/prisma-records.adapter.ts`. 사진 검증도 같은 구조를 따른다 —
  `ports/image-inspector.port.ts` + `adapters/sharp-image-inspector.adapter.ts`.
- in-memory adapter는 만들지 않았다 (§2의 Phase 1 생략 결정) — 단위 테스트의 fake가 그 역할을 한다.
