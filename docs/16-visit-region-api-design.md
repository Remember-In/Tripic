# 방문 관광지 저장·지도 진행률 API 설계

| 항목        | 내용                                                                                                           |
| ----------- | -------------------------------------------------------------------------------------------------------------- |
| 상태        | **BLOCKED — 위치정보지원센터 사전 검토 통과 후 구현·노출**                                                     |
| 목적        | 웹에서 사용자가 키워드 검색으로 확정한 관광지를 기록에 연결하고, 시·도 지도 스탬프를 계정 단위로 복원한다      |
| 선행 문서   | [12-location-law.md](./12-location-law.md), [15-web-client-server-design.md](./15-web-client-server-design.md) |
| 관련 스키마 | `apps/api/prisma/schema.prisma`의 `RecordPlace`                                                                |

> 이 문서는 서버 구현을 위한 계약 초안이다. 상담 결과가 문서의 법적 전제와 다르면 계약과 저장 구조를
> 먼저 수정한다. 승인 전에는 프로덕션 라우트를 등록하거나 클라이언트에서 호출하지 않는다.

---

## 1. 범위와 완료 조건

### 1.1 P0 범위

- 사용자가 관광지를 **키워드로 검색하고 직접 선택**한다.
- 선택한 관광지를 여행 기록에 추가·조회·수정·삭제한다.
- 계정에 저장된 관광지를 `areaCode` 기준으로 집계해 대한민국 시·도 지도에 방문 여부를 표시한다.
- 기록 또는 관광지가 삭제되면 방문 지역 수와 스탬프가 즉시 원복된다.
- 로그인한 사용자는 다른 기기에서도 같은 방문 관광지와 지도 진행률을 조회할 수 있다.

### 1.2 제외 범위

- GPS 좌표, 사진 EXIF, 현재 위치, 역지오코딩 결과의 서버 수신
- 브라우저 위치 권한 요청과 주변 관광지 검색
- KTO 관광지명·주소·소개·이미지의 DB 저장 또는 캐시
- 시·군·구 상세 지도, 뱃지·칭호, 랭킹

### 1.3 완료 조건

1. 아래 API가 인증·소유권·입력 검증을 포함해 동작한다.
2. 관광지 추가 후 `GET /map/progress`의 해당 `areaCode.visitCount`가 증가한다.
3. 관광지·기록·계정 삭제 후 집계가 감소하며, 마지막 방문이 삭제되면 해당 지역이 응답에서 사라진다.
4. 요청/애플리케이션 로그에 GPS·EXIF·KTO 원문 응답이 남지 않는다.
5. 서비스·어댑터 단위 테스트와 인증 포함 e2e 테스트가 통과한다.
6. 위치정보지원센터 검토 결과와 개인정보 처리방침 반영이 완료된다.

---

## 2. 데이터 경계

### 2.1 클라이언트가 보내는 값

```ts
type CreateRecordPlaceInput = {
  contentId: string;
  visitedAt: string; // ISO 8601
};
```

클라이언트는 `contentId`와 사용자가 선택한 방문일만 보낸다. `areaCode`, `sigunguCode`,
`categoryCode`는 클라이언트 값을 신뢰하지 않고 서버가 KTO 상세 조회 결과에서 추출한다. 이 방식은 임의의
지역코드를 보내 지도 스탬프를 조작하는 것을 방지한다.

### 2.2 서버가 저장하는 값

| 필드                      | 저장 여부          | 설명                                      |
| ------------------------- | ------------------ | ----------------------------------------- |
| `ktoContentId`            | 저장               | KTO 관광지 식별자                         |
| `visitedAt`               | 저장               | 사용자가 확정한 방문일시                  |
| `areaCode`                | 저장               | KTO 상세 응답에서 검증한 시·도 코드       |
| `sigunguCode`             | 선택 저장          | KTO 상세 응답에서 검증한 시·군·구 코드    |
| `categoryCode`            | 선택 저장          | KTO 상세 응답에서 검증한 관광 유형 코드   |
| 관광지명·주소·소개·이미지 | **저장 금지**      | 화면 표시 시 TourAPI 프록시로 실시간 조회 |
| GPS·EXIF                  | **수신·저장 금지** | 요청 스키마에도 필드를 만들지 않는다      |

`RecordPlace`는 `Record`에 `onDelete: Cascade`로 연결한다. 진행률 테이블을 별도로 두지 않고
`record_places`를 조회 시점에 집계해 삭제 정합성을 보장한다.

### 2.3 KTO 장애 시 원칙

관광지 추가·장소 변경 시 서버는 KTO에서 `contentId`와 지역코드를 확인한다. KTO가 실패하면 검증되지 않은
클라이언트 지역코드를 대신 저장하지 않고 요청을 실패시킨다.

- KTO 타임아웃: `504`
- KTO 오류: `502`
- 존재하지 않는 `contentId`: `404`
- 서버의 `KTO_SERVICE_KEY` 미설정: `503`

---

## 3. API 계약

모든 라우트는 Bearer 인증이 필요하다. 없는 기록과 타인의 기록은 모두 `404`로 응답해 소유권을 숨긴다.

### 3.1 방문 관광지 추가

```http
POST /records/:recordId/places
Content-Type: application/json

{
  "contentId": "126508",
  "visitedAt": "2026-09-20T00:00:00.000Z"
}
```

처리 순서:

1. 로그인 사용자의 기록인지 확인한다.
2. `contentId` 형식과 `visitedAt`을 검증한다.
3. KTO 상세 조회로 관광지 존재 여부와 지역코드를 확인한다.
4. `contentId`, 방문일시, 지역·분류 코드만 저장한다.
5. 생성된 `RecordPlace`를 `201`로 반환한다.

동일 기록에서 `ktoContentId + visitedAt`이 완전히 같은 요청은 중복으로 간주해 `409`를 반환한다.
이를 DB unique 제약으로도 고정한다.

### 3.2 기록의 방문 관광지 조회

```http
GET /records/:recordId/places
```

```json
[
  {
    "id": "0199...",
    "recordId": "0198...",
    "contentId": "126508",
    "areaCode": "1",
    "sigunguCode": "23",
    "categoryCode": "A02",
    "visitedAt": "2026-09-20T00:00:00.000Z",
    "createdAt": "2026-09-20T05:20:00.000Z"
  }
]
```

응답에는 저장된 식별자와 코드만 포함한다. 관광지명·주소·이미지가 필요하면 클라이언트가
`GET /tourism/places/:contentId`를 호출해 실시간으로 결합한다.

### 3.3 방문 관광지 수정

```http
PATCH /records/:recordId/places/:placeId
Content-Type: application/json

{
  "contentId": "126508",
  "visitedAt": "2026-09-21T00:00:00.000Z"
}
```

- 두 필드는 모두 선택 사항이지만 최소 하나는 있어야 한다.
- `contentId`가 바뀌면 KTO 상세 조회를 다시 수행하고 지역·분류 코드를 함께 교체한다.
- `visitedAt`만 바뀌면 KTO를 다시 호출하지 않는다.
- 수정 대상이 다른 사용자의 기록에 속하면 `404`다.

### 3.4 방문 관광지 삭제

```http
DELETE /records/:recordId/places/:placeId
```

성공 시 `204`를 반환한다. 별도 진행률 행은 없으므로 다음 `GET /map/progress`부터 삭제 결과가 즉시
반영된다. `DELETE /records/:recordId`와 `DELETE /users/me`에서는 FK cascade로 함께 삭제된다.

### 3.5 지도 진행률 조회

```http
GET /map/progress
```

```json
{
  "visitedAreaCount": 2,
  "totalAreaCount": 17,
  "recordedPlaceCount": 3,
  "regions": [
    {
      "id": "1",
      "areaCode": "1",
      "visitCount": 2,
      "firstVisitedAt": "2026-09-05T00:00:00.000Z",
      "lastVisitedAt": "2026-09-20T00:00:00.000Z"
    },
    {
      "id": "6",
      "areaCode": "6",
      "visitCount": 1,
      "firstVisitedAt": "2026-08-12T00:00:00.000Z",
      "lastVisitedAt": "2026-08-12T00:00:00.000Z"
    }
  ]
}
```

집계 규칙:

- 로그인 사용자가 소유한 `record_places`만 집계한다.
- `visitCount`는 해당 `areaCode`의 장소 행 수다.
- `visitedAreaCount`는 `visitCount > 0`인 서로 다른 `areaCode` 수다.
- `recordedPlaceCount`는 사용자의 전체 장소 행 수다.
- `totalAreaCount`는 현재 지도 기준 `17`이다.
- `regions`에는 방문한 지역만 담고 `areaCode` 오름차순으로 정렬한다.
- `id`는 별도 진행률 테이블 ID가 아니라 안정적인 식별을 위한 `areaCode`와 같은 값이다.

---

## 4. 공유 계약

`@tripic/shared`에 다음 Zod 스키마와 응답 타입을 추가한다.

```ts
createRecordPlaceSchema;
updateRecordPlaceSchema;
recordPlaceSchema;
mapProgressResponseSchema;

CreateRecordPlaceInput;
UpdateRecordPlaceInput;
RecordPlace;
MapProgressResponse;
```

좌표와 매칭 경위(`GPS_CANDIDATE`, `matchConfidence`)는 서버 계약에 포함하지 않는다. 서버에는 사용자가
직접 확정한 결과만 도달해야 한다.

---

## 5. 서버 구현 구조

`apps/api/AGENTS.md`의 경량 헥사고날 구조를 따른다.

```text
records/
  records.controller.ts
  records.service.ts
  ports/records-repository.port.ts
  adapters/prisma-records.adapter.ts

map/
  map.controller.ts
  map.service.ts
  ports/map-progress-repository.port.ts
  adapters/prisma-map-progress.adapter.ts
```

- KTO 조회는 기존 `KtoClientPort`를 재사용한다.
- 컨트롤러는 Zod 검증과 서비스 위임만 담당한다.
- 장소 저장과 중복 검사에 필요한 트랜잭션·unique 경합은 Prisma adapter가 흡수한다.
- 진행률 조회는 `RecordPlace → Record.userId` 조건으로 DB에서 집계한다.
- 요청 본문과 KTO 원문 응답을 로그에 남기지 않는다.

---

## 6. 오류 규약

| 상태  | 조건                                                     |
| ----- | -------------------------------------------------------- |
| `400` | 잘못된 `contentId`·날짜·빈 PATCH 본문·허용하지 않은 필드 |
| `401` | Bearer 토큰 없음 또는 무효                               |
| `404` | 기록·장소·KTO 관광지 없음 또는 타인 소유 자원            |
| `409` | 같은 기록의 동일 관광지·동일 방문일 중복                 |
| `502` | KTO 상류 오류 또는 비정상 응답                           |
| `503` | `KTO_SERVICE_KEY` 미설정                                 |
| `504` | KTO 요청 타임아웃                                        |

오류 본문은 기존 공통 `{ message, issues? }` 형식을 유지하고 KTO 서비스키·상류 원문을 포함하지 않는다.

---

## 7. 테스트 요구사항

### 7.1 서비스 단위 테스트

- 장소 추가 시 소유권 확인 후 KTO 검증값만 저장한다.
- 클라이언트가 추가 필드로 좌표·지역코드를 보내면 계약 검증에서 거부한다.
- `contentId` 변경 시 지역코드를 다시 계산하고, 방문일만 변경할 때는 KTO를 호출하지 않는다.
- 다른 사용자의 기록·장소는 동일하게 not found로 처리한다.
- 중복 추가를 `409` 의미의 도메인 오류로 변환한다.
- 진행률은 사용자별로 격리하고 최초·최근 방문일을 정확히 집계한다.

### 7.2 e2e 테스트

- 인증 없이 모든 라우트 `401`
- 생성 → 조회 → 수정 → 삭제 정상 흐름
- 다른 사용자 자원 접근 `404`
- 관광지 추가 후 진행률 증가
- 장소 삭제, 기록 삭제, 회원탈퇴 후 진행률 원복
- 동일 관광지·동일 방문일 동시 생성 경합에서 하나만 성공
- KTO disabled/error/timeout의 `503/502/504` 매핑
- 요청에 `latitude`, `longitude`, `gps`, `exif`가 포함되면 `400`

---

## 8. 클라이언트 연결 순서

1. 기록 생성과 사진·메모 업로드를 완료한다.
2. 사용자가 관광지를 선택한 경우에만 `POST /records/:recordId/places`를 호출한다.
3. 장소 저장 실패 시 기록 전체를 자동 삭제하지 않고, 기록 상세에서 방문 정보를 다시 추가할 수 있게 한다.
4. 홈에서 `GET /map/progress`를 조회해 `regions[].areaCode`를 `TravelMap`에 전달한다.
5. 기록 수정 화면에서 장소 조회·수정·삭제를 연결한다.
6. 장소명·주소가 필요하면 `contentId`로 TourAPI 상세를 실시간 조회한다.

현재 웹 클라이언트는 관광지 검색과 선택 상태까지 구현돼 있다. API가 승인·배포되면
`RecordCreatePage`의 `selectedPlace` 저장과 `HomePage`의 `RegionProgress` 조회를 연결한다.

---

## 9. 구현 시작 게이트

- [ ] 위치정보지원센터 사전 검토 결과 기록
- [ ] 서버 저장 가능 범위(`contentId`, 방문일, 지역코드) 확인
- [ ] 개인정보 처리방침에 계정 연결 방문 이력 처리 목적·보관·삭제 반영
- [ ] 위치기반서비스 이용약관/사업 신고 필요 여부 확정
- [ ] `apps/api/AGENTS.md`와 금지 규칙을 상담 결과에 맞게 갱신
- [ ] 본 계약 최종 리뷰 후 shared schema부터 TDD로 구현
