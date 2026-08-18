# @tripic/api

Tripic의 **비위치성 운영 API** 서버 (NestJS). 공지·약관·앱 설정·버전 체크 등 운영 기능만 담당한다.

> 설계 원칙 (PRD 10.3 / 14.2):
>
> - 사용자 **GPS 좌표·EXIF 원본 사진·방문 기록을 수신/저장하지 않는다.**
> - 관광공사 OpenAPI 호출/데이터 저장을 하지 않는다 (앱이 직접 호출).
> - **P0에서는 DB/ORM을 사용하지 않는다.**
>   P1 확장으로 **계정/인증(카카오 로그인) + 사용자 확정 여행 기록** PostgreSQL + Prisma 스키마를 도입했다
>   (여행 기록은 스키마만 준비 — 동기화 API 노출은 위치정보지원센터 사전 검토 후) —
>   [docs/10-auth-db-design.md](../../docs/10-auth-db-design.md) 참고. GPS·위치·KTO 원천 데이터는 여전히 저장하지 않는다.

## 실행

루트에서 의존성 설치 후(`pnpm install`), 아래 중 택1:

```bash
# 루트에서
pnpm api:dev                          # 개발 서버 (watch)

# 또는 filter
pnpm --filter @tripic/api start:dev   # 개발 (watch)
pnpm --filter @tripic/api start       # 개발 (단발)
pnpm --filter @tripic/api build       # 빌드 (nest + SWC → dist/)
pnpm --filter @tripic/api start:prod  # 빌드 산출물 실행 (node dist/src/main)
```

기본 포트 `3000` (환경변수 `PORT`로 변경). 동작 확인:

```bash
curl http://localhost:3000/health     # → {"status":"ok"}
```

## 로컬 DB (PostgreSQL + Prisma)

계정/인증 + 여행 기록 스키마는 `prisma/schema.prisma`에 있다. 로컬 DB는 레포 루트의 docker-compose로 기동한다:

```bash
docker compose up -d db                                # postgres 18 (호스트 포트 48291)
cp apps/api/.env.example apps/api/.env                 # DATABASE_URL 준비
pnpm --filter @tripic/api db:migrate                   # 마이그레이션 적용 (스키마 변경 시 --name 지정)
pnpm prisma migrate status                             # 적용 상태 확인 (apps/api에서)
```

Prisma 7 규칙에 따라 datasource url은 `prisma.config.ts`에서 관리한다 (schema.prisma에는 없음).
설계 배경과 ERD는 [docs/10-auth-db-design.md](../../docs/10-auth-db-design.md) 참고.

## 엔드포인트 (PRD 14.2)

| Method | Path             | 설명                   | 상태           |
| ------ | ---------------- | ---------------------- | -------------- |
| GET    | `/health`        | 서버 상태 확인         | ✅ 동작        |
| GET    | `/app-config`    | 앱 설정값 조회         | ⏳ 스텁 (TODO) |
| GET    | `/notices`       | 공지사항 조회          | ⏳ 스텁 (TODO) |
| GET    | `/legal/terms`   | 이용약관 조회          | ⏳ 스텁 (TODO) |
| GET    | `/legal/privacy` | 개인정보 처리방침 조회 | ⏳ 스텁 (TODO) |
| GET    | `/version`       | 앱 최소 지원 버전 조회 | ⏳ 스텁 (TODO) |

스텁 라우트는 골격만 있고 실제 운영 데이터 연결은 다음 단계에서 진행한다.

## 구조

```txt
apps/api/
  src/
    main.ts              # 부트스트랩 (NestFactory)
    app.module.ts        # 루트 모듈 (운영 모듈 등록)
    health/              # GET /health
    app-config/          # GET /app-config
    notices/             # GET /notices
    legal/               # GET /legal/terms, /legal/privacy
    version/             # GET /version
  test/
    app.e2e-spec.ts      # e2e (Vitest + PactumJS)
  nest-cli.json          # builder: swc, typeCheck: true
  .swcrc                 # SWC 설정 (데코레이터 메타데이터 + @/ paths 재작성)
  tsconfig.json          # @tripic/tsconfig/base.json extends, types:[node], paths @/*
  tsconfig.build.json    # 빌드용 (test 제외)
  vitest.config.ts       # 단위 테스트
  vitest.config.e2e.ts   # e2e 테스트
```

## 빌드 / 타입체크 / 테스트

| 명령        | 도구                                        | 비고                                                |
| ----------- | ------------------------------------------- | --------------------------------------------------- |
| `build`     | NestJS + **SWC**                            | tsconfig `paths`(`@/*`)를 빌드 시 상대경로로 재작성 |
| `typecheck` | **tsgo** (`tsgo -p tsconfig.json --noEmit`) | TS7 네이티브 프리뷰                                 |
| `test`      | **Vitest** + unplugin-swc                   | `src/**/*.spec.ts`                                  |
| `test:e2e`  | **Vitest + PactumJS**                       | 부팅된 앱에 HTTP 호출, `test/**/*.e2e-spec.ts`      |

```bash
pnpm --filter @tripic/api typecheck
pnpm --filter @tripic/api test
pnpm --filter @tripic/api test:e2e
```

## 규칙

- 모듈 import는 루트 기준 별칭 `@/*` 사용 (상대경로 `..` 지양).
- 공유 타입이 필요하면 `@tripic/shared`를 사용한다 (관광공사 원천 데이터 모델은 저장/정의하지 않음).
