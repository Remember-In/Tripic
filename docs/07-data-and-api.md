# 07. 데이터 저장 정책 · 로컬 데이터 모델 · API 역할 (PRD 12~14장)

> 원문: [00-prd-full.md](./00-prd-full.md) · 인덱스: [README.md](./README.md)

## 12. 데이터 저장 정책

### 12.1 로컬 저장 대상

로컬 사용자 식별자, 사진 로컬 참조, contentId, 방문일시, 지역코드, 시군구코드(선택), 관광 유형 코드(선택), 매칭 방식, 매칭 신뢰도, 사용자 확정 여부, 지도 진행률, 사용자 메모.

### 12.2 저장하지 않는 데이터

관광지명, 주소, 관광지 소개, 대표 이미지 URL, OpenAPI 응답 전문, 관광지 목록, 관광사진 데이터, 지역코드 전체 목록, 분류코드 전체 목록, GPS 위도/경도(기본 미저장). 단, 화면 표시용으로 응답을 메모리에서 일시 사용은 가능.

### 12.3 서버 저장 정책

GPS 좌표 서버 미전송, EXIF 포함 원본 사진 미업로드, 방문 장소 기록 서버 미저장. 비위치성 앱 설정·공지·약관만 서버 제공.

> **P1 진행 현황**: 계정/인증 + 사용자 확정 여행 기록(제목/일기/contentId·지역코드)의 서버 스키마가
> 준비되었다 ([10-auth-db-design.md](./10-auth-db-design.md)). 기록 중 **콘텐츠(제목·일기·해시태그)는
> 서버 저장/API 노출 가능**([11-records-api-design.md](./11-records-api-design.md))하며, **방문 관광지
> (record_places) API만 위치정보지원센터 사전 검토 후** 노출한다. GPS 좌표·EXIF·KTO 원천 데이터
> 미저장 원칙은 그대로다. 사진은 **위치 메타데이터를 제거한 사본만 선택 저장**한다
> ([11-records-api-design.md](./11-records-api-design.md) §3.1) — 원본·EXIF 포함 사진 미업로드
> 원칙(§12.3)과 양립한다.

## 13. 최소 로컬 데이터 모델

타입 정의는 [`packages/shared/src/types`](../packages/shared/src/types/index.ts)에 구현되어 있다.

### LocalPhoto

| 필드           | 설명                    |
| -------------- | ----------------------- |
| id             | 로컬 사진 ID            |
| local_asset_id | 사진 라이브러리 참조 ID |
| taken_at       | 촬영일시                |
| has_gps        | GPS 존재 여부           |
| created_at     | 기록 생성일시           |

주의: GPS 위도/경도는 P0에서 저장하지 않음(앱 내부 임시 메모리만).

### VisitRecord

| 필드                                 | 설명                 |
| ------------------------------------ | -------------------- |
| id                                   | 로컬 방문 기록 ID    |
| local_photo_id                       | 연결된 사진 ID       |
| content_id                           | 관광공사 contentId   |
| visited_at                           | 방문일시             |
| area_code                            | 관광공사 지역코드    |
| sigungu_code                         | 시군구코드(선택)     |
| category_code                        | 관광 유형 코드(선택) |
| match_method                         | 매칭 방식            |
| match_confidence                     | 매칭 신뢰도          |
| user_confirmed                       | 사용자 확정 여부     |
| created_at / updated_at / deleted_at | 생성/수정/삭제일시   |

### RegionProgress

| 필드                               | 설명                   |
| ---------------------------------- | ---------------------- |
| id                                 | 로컬 진행률 ID         |
| area_code                          | 관광공사 지역코드      |
| visit_count                        | 해당 지역 방문 기록 수 |
| first_visited_at / last_visited_at | 최초/최근 방문일       |

### UserMemo

| 필드                    | 설명             |
| ----------------------- | ---------------- |
| id                      | 메모 ID          |
| visit_record_id         | 방문 기록 ID     |
| memo                    | 사용자 작성 메모 |
| created_at / updated_at | 생성/수정일시    |

### BadgeProgress (P1)

| 필드               | 설명           |
| ------------------ | -------------- |
| id                 | 뱃지 진행률 ID |
| badge_key          | 뱃지 식별자    |
| earned / earned_at | 획득 여부/일시 |

## 14. API 역할 정의

### 14.1 앱에서 직접 호출하는 한국관광공사 OpenAPI

| 목적                           | 호출 방식                     |
| ------------------------------ | ----------------------------- |
| GPS 기반 주변 관광지 후보 조회 | 위치 기반 관광정보 OpenAPI    |
| GPS 없는 사진의 관광지 검색    | 키워드 검색 OpenAPI           |
| 관광지 상세 정보 표시          | contentId 기반 공통정보 조회  |
| 기록 카드 대표 이미지 표시     | 이미지정보 조회               |
| 지도 스탬프 반영               | 지역코드 / 분류코드 정보 활용 |

### 14.2 NestJS 서버 API (비위치성 운영 전용)

| API                | 역할                   |
| ------------------ | ---------------------- |
| GET /health        | 서버 상태 확인         |
| GET /app-config    | 앱 설정값 조회         |
| GET /notices       | 공지사항 조회          |
| GET /legal/terms   | 이용약관 조회          |
| GET /legal/privacy | 개인정보 처리방침 조회 |
| GET /version       | 앱 최소 지원 버전 조회 |

서버가 수신하지 않는 데이터: GPS 좌표, EXIF 포함 원본 사진, 실시간 위치 정보, 방문 장소 기록.
