# Tripic 문서

사진 기반 여행 기록 게이미피케이션 서비스의 PRD를 주제별로 분할한 문서 모음입니다.
원문 전체는 [00-prd-full.md](./00-prd-full.md)에 보존되어 있습니다.

## 목차

| 문서                                                   | 내용                                                | PRD 원문 장 |
| ------------------------------------------------------ | --------------------------------------------------- | ----------- |
| [01-overview.md](./01-overview.md)                     | 제품 개요 · 배경/문제 · 목표/제외 목표              | 1~3         |
| [02-users-scenarios.md](./02-users-scenarios.md)       | 타겟 페르소나 · P0 핵심 사용자 시나리오             | 4~5         |
| [03-requirements-p0.md](./03-requirements-p0.md)       | 기능 요구사항 P0                                    | 6           |
| [04-requirements-p1.md](./04-requirements-p1.md)       | 기능 요구사항 P1                                    | 7           |
| [05-screens.md](./05-screens.md)                       | 화면 정의                                           | 8           |
| [06-architecture.md](./06-architecture.md)             | 시스템 아키텍처 · 기술 스택 · 모노레포 구조         | 9~11        |
| [07-data-and-api.md](./07-data-and-api.md)             | 데이터 저장 정책 · 로컬 데이터 모델 · API 역할      | 12~14       |
| [08-privacy-risk.md](./08-privacy-risk.md)             | 성능/UX · 개인정보/위치정보 정책 · 리스크           | 15~17       |
| [09-release-principles.md](./09-release-principles.md) | 릴리스 계획 · 완료 기준 · 설계 원칙 · 기술 의사결정 | 18~21       |

## 핵심 제약 (전 문서 공통)

- 한국관광공사 OpenAPI는 **실시간 호출**하며, 원천 데이터를 로컬/서버 DB에 저장·캐싱 서빙하지 않는다.
- 사용자 **GPS 좌표는 백엔드 서버로 전송하지 않는다** (앱 내부에서만 사용).
- **P0에서는 서버 DB/ORM을 사용하지 않는다.** NestJS 서버는 비위치성 운영 API에 한정한다.
