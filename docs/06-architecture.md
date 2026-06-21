# 06. 시스템 아키텍처 · 기술 스택 · 모노레포 구조 (PRD 9~11장)

> 원문: [00-prd-full.md](./00-prd-full.md) · 인덱스: [README.md](./README.md)

## 9. 시스템 아키텍처 및 데이터 흐름

```mermaid
flowchart TD
    subgraph Mobile["React Native + Expo App"]
        A["사진 선택"]
        B["EXIF 검사<br/>GPS / 촬영일시"]
        C["GPS는 앱 내부에서만 사용"]
        D["한국관광공사 OpenAPI 직접 호출<br/>위치 기반 관광정보 / 키워드 검색"]
        E["관광지 후보 목록 구성"]
        F["사용자 방문지 선택/확정"]
        G["기록 카드 생성"]
        H["지도 스탬프 반영"]
        LDB["로컬 저장소<br/>Expo SQLite<br/>contentId / 방문일시 / 사진 참조 / 진행률"]
        Q["TanStack Query<br/>OpenAPI 로딩 / 에러 / 재시도 관리"]
    end

    subgraph KTO["한국관광공사 OpenAPI"]
        K1["위치 기반 관광정보 조회"]
        K2["키워드 검색"]
        K3["공통정보 조회<br/>관광지명 / 주소 / 소개"]
        K4["이미지정보 조회"]
        K5["지역코드 / 분류코드 조회"]
    end

    subgraph API["NestJS Server on Northflank<br/>P0 보조 서버"]
        S1["Health Check"]
        S2["App Config"]
        S3["Notices"]
        S4["Terms / Privacy"]
        S5["Version Check"]
        S6["GPS 좌표 수신 없음<br/>EXIF 포함 사진 수신 없음<br/>DB 없음 / ORM 없음"]
    end

    A --> B --> C --> Q --> D
    D --> K1 & K2 & K3 & K4 & K5
    K1 --> E
    K2 --> E
    K3 --> G
    K4 --> G
    K5 --> H
    E --> F --> G --> H --> LDB
    Mobile -. "비위치성 운영 정보 조회" .-> API
```

## 10. 기술 스택

### 10.1 Monorepo

| 항목                | 선택                      |
| ------------------- | ------------------------- |
| Package Manager     | pnpm workspace            |
| Build Orchestration | P0에서는 Turborepo 미사용 |
| Language            | TypeScript                |
| Shared Package      | 공통 타입·상수·스키마     |

P0에서는 pnpm workspace만 사용. Turborepo는 패키지/캐싱 필요 시점에 도입 검토.

### 10.2 Mobile App

| 항목            | 선택                                          |
| --------------- | --------------------------------------------- |
| Framework       | React Native                                  |
| Runtime/Tooling | Expo                                          |
| Routing         | Expo Router                                   |
| Language        | TypeScript                                    |
| API State       | TanStack Query                                |
| Local Storage   | Expo SQLite                                   |
| Client State    | Zustand (선택)                                |
| Map UI          | 추후 라이브러리 선정                          |
| EXIF 처리       | RN/Expo 환경 이미지 메타데이터 접근 방식 검토 |

주의: TanStack Query 캐시는 UI용 메모리 캐시로만 사용하고 관광공사 데이터를 영구 캐싱/저장하지 않는다.

### 10.3 Backend

| 항목      | 선택                   |
| --------- | ---------------------- |
| Framework | NestJS                 |
| Runtime   | Node.js LTS            |
| Deploy    | Northflank             |
| DB        | P0 없음                |
| ORM       | P0 없음                |
| API Docs  | Swagger/OpenAPI (선택) |
| Container | Dockerfile 기반 배포   |

P0 서버 역할: Health Check, App Config, Notices, Terms/Privacy, Version Check, 비위치성 오류 로그(선택).
P0 서버가 하지 않는 일: GPS 좌표 수신, EXIF 포함 사진 수신, 방문 장소 저장, 후보 매칭, OpenAPI 데이터 저장/캐싱 서빙, OpenAPI 프록시(P0 제외).

### 10.4 P1 이후 서버 확장 후보

계정 로그인, 기기 간 동기화, 공유 링크, 서버 백업, 관리자 페이지, 서버 AI 해설 저장, 사용자별 통계 저장이 필요하면 DB/ORM 검토. 후보 스택: PostgreSQL + Prisma + NestJS 유지 + Northflank/Managed DB. 사용자별 장소 기록 서버 저장 시 위치정보지원센터 공식 사전 검토 후 진행.

## 11. 모노레포 구조 (PRD 제안)

```txt
travel-stamp/
  apps/
    mobile/   # Expo Router 기반 (app/, src/features, src/lib/{kto,storage,query})
    api/      # NestJS (src/{health,app-config,notices,legal,version}, main.ts)
  packages/
    shared/   # types / constants / schemas
    config/   # tsconfig / eslint
  package.json
  pnpm-workspace.yaml
```

### 11.1 packages/shared

공유 항목: `MatchMethod`, `MatchConfidence`, `VisitRecord`, `RegionCode`, KTO 응답 파싱용 타입 일부, Zod schema(선택), 공통 상수.
주의: OpenAPI 응답 전문 저장용 모델을 만들지 않는다. 화면 표시·파싱용 타입만 정의한다.

---

## 구현 메모 (실제 저장소 ↔ PRD 차이)

> PRD 제안과 실제 스캐폴딩이 다른 부분. 의사결정 배경은 백엔드 개발자 세팅 단계에서 확정.

- **프로젝트명**: `travel-stamp`(PRD 예시) → 실제 `tripic`, 패키지 스코프 `@tripic/*`.
- **공유 설정 위치**: PRD의 `packages/config` 대신 **루트로 끌어올림** — `tsconfig.base.json` + `eslint.config.js`(flat). 패키지는 `../../tsconfig.base.json`을 extends하고, 린트는 루트 flat config 하나로 전체 처리. 우회 한 단계 제거 목적.
- **TypeScript**: `typescript@^6`(TS6, 마지막 JS 기반) + **`@typescript/native-preview`(tsgo)** 병행. 타입체크는 tsgo, `apps/api` 빌드는 `nest build`(tsc) 유지 — NestJS `emitDecoratorMetadata`/DI 안정성 때문.
- **툴 버전 고정**: `mise.toml`로 node/pnpm 핀.
- **모바일**: 이번 단계는 placeholder만(`apps/mobile/`), Expo 스캐폴딩은 추후.
