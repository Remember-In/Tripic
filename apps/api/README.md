# @tripic/api

Tripic의 백엔드 API 서버 (NestJS) — **비위치성 운영 API**(공지·약관·앱 설정·버전)와 **계정/인증**(카카오 로그인, 구현 완료), **여행 기록 콘텐츠**(설계 단계)를 담당한다.

> 설계 원칙 (PRD 10.3 / 14.2):
>
> - 사용자 **GPS 좌표·EXIF 원본 사진·방문 기록을 수신/저장하지 않는다.**
> - 관광공사 OpenAPI 호출/데이터 저장을 하지 않는다 (앱이 직접 호출).
> - **P0에서는 DB/ORM을 사용하지 않는다.**
>   P1 확장으로 **계정/인증(카카오 로그인) + 사용자 확정 여행 기록** PostgreSQL + Prisma 스키마를 도입했다
>   (기록 콘텐츠 API는 설계 완료([docs/11](../../docs/11-records-api-design.md)), 방문 관광지 API만 위치정보지원센터 사전 검토 후 노출) —
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
cp apps/api/.env.example apps/api/.env                 # env 준비 후 SECRET/KAKAO_APP_ID 채우기
pnpm --filter @tripic/api db:migrate                   # 마이그레이션 적용 (스키마 변경 시 --name 지정)
pnpm --filter @tripic/api db:generate                  # Prisma client 생성 (src/generated, 미커밋)
pnpm prisma migrate status                             # 적용 상태 확인 (apps/api에서)
```

Prisma 7 규칙에 따라 datasource url은 `prisma.config.ts`에서 관리한다 (schema.prisma에는 없음).
설계 배경과 ERD는 [docs/10-auth-db-design.md](../../docs/10-auth-db-design.md) 참고.

## 엔드포인트 (PRD 14.2 + docs/10 §6)

| Method | Path             | 인증   | 설명                                | 상태                                                     |
| ------ | ---------------- | ------ | ----------------------------------- | -------------------------------------------------------- |
| GET    | `/health`        | 공개   | 서버 상태 확인                      | ✅ 동작                                                  |
| POST   | `/auth/kakao`    | 공개   | 카카오 토큰 교환 로그인/가입        | ✅ 동작                                                  |
| POST   | `/auth/refresh`  | 공개   | refresh rotation (재사용 감지)      | ✅ 동작                                                  |
| POST   | `/auth/logout`   | Bearer | refresh family 전체 revoke          | ✅ 동작                                                  |
| GET    | `/users/me`      | Bearer | 내 프로필                           | ✅ 동작                                                  |
| PATCH  | `/users/me`      | Bearer | 닉네임 설정/변경 (온보딩)           | ✅ 동작                                                  |
| GET    | `/app-config`    | 공개   | 앱 설정값 조회                      | ⏳ 스텁 (TODO)                                           |
| GET    | `/notices`       | 공개   | 공지사항 조회                       | ⏳ 스텁 (TODO)                                           |
| GET    | `/legal/terms`   | 공개   | 이용약관 조회                       | ⏳ 스텁 (TODO)                                           |
| GET    | `/legal/privacy` | 공개   | 개인정보 처리방침 조회              | ⏳ 스텁 (TODO)                                           |
| GET    | `/version`       | 공개   | 앱 최소 지원 버전 조회              | ⏳ 스텁 (TODO)                                           |
| \*     | `/records...`    | Bearer | 여행 기록 콘텐츠 CRUD + 날짜별 일기 | 📝 설계 ([docs/11](../../docs/11-records-api-design.md)) |

전역 guard 는 default-deny — `@Public()` 라우트만 인증 없이 접근 가능하다.
개발 원칙(TDD·헥사고날·SOLID)은 [CLAUDE.md](./CLAUDE.md) 참고.

## 구조

```txt
apps/api/
  src/
    main.ts              # 부트스트랩 (NestFactory + enableShutdownHooks)
    app.module.ts        # 루트 모듈 (ConfigModule.validate + 도메인/운영 모듈)
    config/env.ts        # zod 환경변수 스키마 (부팅 시 검증)
    prisma/              # PrismaModule/PrismaService (driver adapter)
    generated/prisma/    # Prisma client (미커밋 — pnpm db:generate 로 생성)
    common/              # ZodValidationPipe
    auth/                # 카카오 로그인 bounded context (헥사고날 — CLAUDE.md)
      auth.controller.ts #   inbound adapter
      auth.service.ts    #   application core (rotation/재사용 감지 정책)
      ports/             #   KakaoVerifier · AuthAccounts · RefreshTokens
      adapters/          #   kakao-api(fetch) · prisma-* 어댑터
      jwt-auth.guard.ts  #   전역 default-deny guard (+@Public/@CurrentUser)
    users/               # 프로필 bounded context (ports/adapters 동일 구조)
    health/ app-config/ notices/ legal/ version/   # 비위치성 운영 API (@Public)
  test/
    global-setup.e2e.ts  # Testcontainers Postgres + prisma migrate deploy
    setup-env.e2e.ts     # 컨테이너 DATABASE_URL 주입
    app.e2e-spec.ts      # e2e (Vitest + PactumJS)
    auth.e2e-spec.ts     # 로그인/refresh rotation/logout e2e (카카오 port stub)
  prisma/                # schema.prisma + migrations
  prisma.config.ts       # Prisma 7 datasource url 관리
  nest-cli.json          # builder: swc, typeCheck: true
  .swcrc                 # SWC 설정 (데코레이터 메타데이터 + @/ paths 재작성)
  tsconfig.json          # @tripic/tsconfig/base.json extends, types:[node], paths @/*
  tsconfig.build.json    # 빌드용 (test 제외)
  vitest.config.ts       # 단위 테스트
  vitest.config.e2e.ts   # e2e 테스트 (globalSetup/env)
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
