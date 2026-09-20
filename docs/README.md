# Tripic 문서

사진 기반 여행 기록 게이미피케이션 서비스의 PRD를 주제별로 분할한 문서 모음입니다.
원문 전체는 [00-prd-full.md](./00-prd-full.md)에 보존되어 있습니다.

## 목차

| 문서                                                               | 내용                                                | PRD 원문 장 |
| ------------------------------------------------------------------ | --------------------------------------------------- | ----------- |
| [01-overview.md](./01-overview.md)                                 | 제품 개요 · 배경/문제 · 목표/제외 목표              | 1~3         |
| [02-users-scenarios.md](./02-users-scenarios.md)                   | 타겟 페르소나 · P0 핵심 사용자 시나리오             | 4~5         |
| [03-requirements-p0.md](./03-requirements-p0.md)                   | 기능 요구사항 P0                                    | 6           |
| [04-requirements-p1.md](./04-requirements-p1.md)                   | 기능 요구사항 P1                                    | 7           |
| [05-screens.md](./05-screens.md)                                   | 화면 정의                                           | 8           |
| [06-architecture.md](./06-architecture.md)                         | 시스템 아키텍처 · 기술 스택 · 모노레포 구조         | 9~11        |
| [07-data-and-api.md](./07-data-and-api.md)                         | 데이터 저장 정책 · 로컬 데이터 모델 · API 역할      | 12~14       |
| [08-privacy-risk.md](./08-privacy-risk.md)                         | 성능/UX · 개인정보/위치정보 정책 · 리스크           | 15~17       |
| [09-release-principles.md](./09-release-principles.md)             | 릴리스 계획 · 완료 기준 · 설계 원칙 · 기술 의사결정 | 18~21       |
| [10-auth-db-design.md](./10-auth-db-design.md)                     | 소셜 로그인(카카오·Apple) 인증/DB 설계 (P1 확장)    | —           |
| [11-records-api-design.md](./11-records-api-design.md)             | 여행 기록 콘텐츠 API 설계 (P1)                      | —           |
| [12-location-law.md](./12-location-law.md)                         | 위치정보법 조사 및 Tripic 적용 판단                 | —           |
| [13-operations-api-design.md](./13-operations-api-design.md)       | 운영 API 응답 계약 (app-config·notices·version)     | —           |
| [14-apple-login-design.md](./14-apple-login-design.md)             | Sign in with Apple 로그인·알림·탈퇴 revoke 설계     | —           |
| [15-web-client-server-design.md](./15-web-client-server-design.md) | 웹 카카오 로그인·세션 쿠키·TourAPI 프록시 설계      | —           |

## 배포 정책 문서

- [개인정보 처리방침 초안](./legal/privacy-policy.ko.md)
- [서비스 이용약관 초안](./legal/terms-of-service.ko.md)
- [위치기반서비스 이용약관 초안](./legal/location-based-service-terms.ko.md)
- [배포 전 정책·개인정보 체크리스트](./legal/release-legal-checklist.md)

## 핵심 제약 (전 문서 공통)

- 한국관광공사 OpenAPI는 **실시간 호출**하며, 원천 데이터를 로컬/서버 DB에 저장·캐싱 서빙하지 않는다.
- 사용자 **GPS 좌표는 Tripic 백엔드 서버나 로컬 DB에 저장하지 않는다**. 위치 기반 후보 검색을 실행하면 앱에서 한국관광공사 OpenAPI로 직접 전송한다.
- **P0에서는 서버 DB/ORM을 사용하지 않는다.** NestJS 서버는 비위치성 운영 API에 한정한다.
  - P1 확장([06-architecture.md](./06-architecture.md) §10.4 사전 승인)으로 **계정/인증 + 사용자 확정 여행 기록** PostgreSQL + Prisma
    스키마를 도입했다 ([10-auth-db-design.md](./10-auth-db-design.md)). GPS·EXIF·KTO 원천 데이터는 여전히 저장하지 않는다.
    여행 기록 중 **콘텐츠(제목·일기·해시태그)는 서버 저장/API 노출 가능**([11-records-api-design.md](./11-records-api-design.md))하고,
    **방문 관광지(record_places) 부분만** 위치정보지원센터 사전 검토 후 노출한다 (법적 근거 조사: [12-location-law.md](./12-location-law.md)).
