# Tripic

사진 기반 여행 기록 게이미피케이션 서비스. 사용자가 촬영한 여행 사진을 선택하면 EXIF 위치 정보를 앱 내부에서 확인하고 한국관광공사 OpenAPI를 실시간 호출하여 방문 기록 카드와 여행 지도를 생성한다.

> 제품 요구사항(PRD)은 [docs/](./docs/README.md)에 주제별로 정리되어 있습니다.

## 모노레포 구조 (pnpm workspace)

```txt
Tripic/
  apps/
    api/        # @tripic/api — NestJS 비위치성 운영 API (health/app-config/notices/legal/version)
    mobile/     # @tripic/mobile — React Native (placeholder, 추후 Expo 스캐폴딩)
  packages/
    shared/     # @tripic/shared — 공통 타입/상수 (앱·서버 공유 계약)
    tsconfig/   # @tripic/tsconfig — 공유 TypeScript 설정 (이름으로 extends)
  docs/         # PRD 분할 문서
```

## 툴체인

| 항목             | 선택                                    | 비고                                                |
| ---------------- | --------------------------------------- | --------------------------------------------------- |
| Package Manager  | pnpm workspace                          | 공통 툴체인은 루트 devDependencies로 통합           |
| Node / pnpm 버전 | `mise.toml`로 고정                      | node 24.17.0 / pnpm 10.34.3                         |
| Language         | TypeScript 6                            | 마지막 JS 기반 메이저                               |
| 타입체크         | **tsgo** (`@typescript/native-preview`) | TS7 네이티브 프리뷰, 빠른 타입체크                  |
| Lint / Format    | ESLint flat config (루트) / Prettier    |                                                     |
| API 빌드         | NestJS + **SWC**                        | tsconfig `paths`(`@/*`)를 빌드 시 상대경로로 재작성 |
| 테스트           | **Vitest** + unplugin-swc               |                                                     |
| E2E              | **Vitest + PactumJS**                   | 부팅된 Nest 앱에 HTTP 호출                          |

경로 별칭: 소스 import는 루트 기준 `@/*` 사용(상대경로 `..` 지양). 공유 tsconfig는 `@tripic/tsconfig`를 이름으로 extends.

## 사전 준비

```bash
mise trust   # mise.toml 신뢰 (최초 1회)
mise install # node/pnpm 설치 (선택)
pnpm install
```

## 워크스페이스 스크립트 (루트)

```bash
pnpm build         # 전체 빌드 (pnpm -r build)
pnpm typecheck     # 전체 타입체크 (tsgo)
pnpm lint          # 전체 린트
pnpm format        # prettier
pnpm api:dev       # NestJS 개발 서버 (watch)
pnpm api:build     # NestJS 빌드
```

## API (apps/api)

```bash
pnpm --filter @tripic/api start:dev   # 개발 서버
pnpm --filter @tripic/api test        # 단위 테스트 (vitest)
pnpm --filter @tripic/api test:e2e    # e2e (pactum)
curl http://localhost:3000/health     # → {"status":"ok"}
```

NestJS 서버는 **비위치성 운영 API에만** 한정한다 (PRD 10.3 / 14.2). GPS 좌표·EXIF 사진·방문 기록을 수신/저장하지 않으며 P0에서 DB/ORM을 사용하지 않는다.
