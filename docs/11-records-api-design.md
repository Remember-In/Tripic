# 여행 기록 콘텐츠 API 설계 (P1)

| 항목 | 내용                                                                                                     |
| ---- | -------------------------------------------------------------------------------------------------------- |
| 상태 | 설계 (구현은 후속 브랜치 — mock 영속화로 시작)                                                           |
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

| Phase | 내용                                                                                 | 게이트                |
| ----- | ------------------------------------------------------------------------------------ | --------------------- |
| 1     | 계약(@tripic/shared zod) 확정 + **mock 영속화(in-memory adapter)**로 엔드포인트 동작 | 없음 — 바로 진행      |
| 2     | in-memory adapter → **Prisma adapter 교체** (DB 스키마·마이그레이션은 이미 존재)     | 없음                  |
| 3     | record_places API(장소 추가/지역별 조회/지도 스탬프 집계) 설계·추가                  | 위치정보지원센터 검토 |

Phase 1의 목적: 모바일이 안정된 계약으로 즉시 개발을 시작할 수 있게 한다.
헥사고날 구조(apps/api/CLAUDE.md)라 adapter 교체 시 controller/service는 무변경이다.

## 3. 엔드포인트 명세

| Method | Path                           | 성공 | 설명                                        |
| ------ | ------------------------------ | ---- | ------------------------------------------- |
| POST   | `/records`                     | 201  | 기록 생성                                   |
| GET    | `/records`                     | 200  | 내 기록 목록 (최근 생성순)                  |
| GET    | `/records/:id`                 | 200  | 상세 + 날짜별 일기 (날짜 오름차순)          |
| PATCH  | `/records/:id`                 | 200  | 제목/테마/문체/해시태그 부분 수정           |
| DELETE | `/records/:id`                 | 204  | 기록 **즉시 영구 삭제** (일기·사진 cascade) |
| PUT    | `/records/:id/entries/:date`   | 200  | 날짜별 일기 작성/수정 (upsert)              |
| DELETE | `/records/:id/entries/:date`   | 204  | 날짜별 일기 **즉시 영구 삭제**              |
| POST   | `/records/:id/photos`          | 201  | EXIF 제거 사본 사진 업로드 (§3.1)           |
| GET    | `/records/:id/photos/:photoId` | 200  | 사진 바이너리 서빙                          |
| DELETE | `/records/:id/photos/:photoId` | 204  | 사진 **즉시 영구 삭제**                     |

**삭제 정책 — 전면 hard delete**: 기록·일기·사진은 물론 **회원 탈퇴를 포함해 모든 삭제는
지체 없는 물리 삭제**다 (PRD "삭제된 기록은 복구하지 않는다" 및 개인정보보호법의 지체 없는
파기 원칙과 일치). 탈퇴는 `users` 행 삭제 → FK cascade 로 소셜 계정·토큰·기록·일기·사진까지
일괄 파기된다 — [docs/10 §3](./10-auth-db-design.md). soft delete 는 사용하지 않는다
(스키마의 `status`/`deletedAt` 은 구현 브랜치에서 제거). 백업본에는 보관 주기 동안 잔존할 수
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
  "createdAt": "2026-08-21T12:00:00.000Z",
  "updatedAt": "2026-08-21T12:00:00.000Z"
}
```

### GET /records — 내 기록 목록

`RecordSummary[]` — `createdAt` 내림차순(최근 생성순). Figma "내 여행 기록"의 기본 정렬.
(지역별 필터는 record_places 소관이라 Phase 3에서 추가한다. 페이지네이션은 기록 수가
문제되기 전까지 도입하지 않는다 — 필요 시 cursor 방식으로 확장.)

### GET /records/:id — 상세

```jsonc
// 200 응답 — RecordDetail (RecordSummary 에서 entryCount 대신 entries)
{
  "id": "0192…",
  "title": "경주 여행",
  "theme": "NATURE_SCENERY",
  "style": "EMOTIONAL_ESSAY",
  "hashtags": ["#경주"],
  "entries": [
    // 날짜 오름차순
    {
      "date": "2026-08-15",
      "content": "석양이 물드는 안압지를 걸었다.",
      "source": "AI", // USER | AI — AI 생성 or 직접 작성 (Figma Flow)
      "createdAt": "2026-08-21T12:10:00.000Z",
      "updatedAt": "2026-08-21T12:10:00.000Z",
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

### PUT /records/:id/entries/:date — 일기 upsert

`:date`는 `YYYY-MM-DD`. 같은 날짜에 다시 쓰면 교체된다 (DB `UNIQUE(recordId, date)`와 일치 — 하루 1편).

```jsonc
// 요청
{ "content": "첫째 날 일기…", "source": "USER" } // content trim 1–5000자
// 200 응답 — RecordEntryView (상세의 entries 요소와 동일 shape)
```

### 3.1 사진 업로드 (PoC 채택)

기기 변경 시 기록↔사진 복원을 위해 **EXIF 제거 사본**을 서버에 저장한다 (PRD가 허용한 경로,
법적 판단은 [12-location-law.md](./12-location-law.md) §3-⑥).

- **클라이언트**: 디코드 → 리사이즈 → **재인코딩**으로 업로드 사본 생성 — 재인코딩은 EXIF를
  구조적으로 소멸시켜 "제거 누락" 결함을 원천 차단한다.
- **서버 검증**: 업로드 스트림 단계의 크기 제한(예: 1MB) + MIME 문자열이 아닌 **실제 이미지
  디코딩 검증**(jpeg/webp) + **모든 메타데이터(EXIF·XMP·GPS) 부재 검증**
  (이중 안전장치 — 위치 메타데이터가 감지되면 400 거부).
- **서빙**: `Content-Type` 명시 + `X-Content-Type-Options: nosniff` 헤더로 콘텐츠 스니핑 차단.
- **저장**: PoC는 PostgreSQL `bytea`(`record_photos` 테이블 — 구현 브랜치에서 마이그레이션 추가).
  규모 증가 시 오브젝트 스토리지로 이관하는 경로를 열어둔다.
- **할당량**: 파일당 제한 외에 **기록당 사진 수 제한(예: 20장)** 과 **사용자 총용량 제한(예: 100MB)**
  을 둔다 — 인증 사용자 1명이 bytea 저장소를 무한정 채우는 것을 방지 (한도 초과 시 413).
  구체 수치는 구현 시 확정 (PoC TODO).
- **동의**: 사진 없이도 서비스 이용이 가능하므로 **선택 동의** + 처리방침 항목 명시, 탈퇴·삭제 시
  파기(위 hard delete 정책).

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

위치정보지원센터 검토 통과 시 추가할 계약의 방향만 적어둔다 (상세 설계는 별도).

- `POST /records/:id/places` — 사용자가 확정한 KTO `contentId` + 방문일 + 지역/분류 코드만
- `PATCH /records/:id/places/:placeId` · `DELETE /records/:id/places/:placeId` — 기록 상세의
  "방문 정보 수정/추가" UI(Figma) 대응. 대표 수정 케이스는 방문일 변경
- `GET /records?area=…` — 지역별 필터, `GET /map/progress` — 방문 시·군 X/157 집계
- 장소명("수성못")·지역명("대구광역시, 수성구")은 저장하지 않고 화면 표시 시 `contentId`·
  지역코드로 KTO OpenAPI를 실시간 조회해 렌더링한다
- GPS 좌표·EXIF·KTO 원천 데이터(관광지명/주소/이미지)는 어떤 경우에도 받지도 저장하지도 않는다

## 7. 구현 원칙 (apps/api/CLAUDE.md)

- TDD: 서비스 단위 테스트(포트 fake) + e2e(PactumJS) 먼저.
- 헥사고날: `records/ports/records-repository.port.ts` + `adapters/in-memory-records.adapter.ts`(Phase 1)
  → `adapters/prisma-records.adapter.ts`(Phase 2). 소유권 필터(userId)는 port 계약에 포함.
- in-memory adapter는 프로세스 재시작 시 데이터가 사라진다 — 개발/계약 검증 용도로만 쓰고
  프로덕션 배포 전 Phase 2 전환을 완료한다.
