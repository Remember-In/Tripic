# syntax=docker/dockerfile:1
#
# @tripic/api 컨테이너 이미지 (Northflank 배포용)
#
# 중요: 이 Dockerfile 은 pnpm 워크스페이스 루트를 빌드 컨텍스트로 가정한다.
#   - 로컬 빌드:   docker build -f apps/api/Dockerfile -t tripic-api .
#   - Northflank:  Build context = 레포 루트, Dockerfile path = apps/api/Dockerfile
#
# 멀티스테이지: build 단계에서 워크스페이스 전체 설치 후 api 빌드 →
# pnpm deploy(injected, .npmrc) 로 prod 의존성만 추린 self-contained 산출물을 lean 런타임에 복사.

# ---------- base (빌드 툴: corepack + 고정 pnpm) ----------
FROM node:24.18.0-alpine3.24 AS base
# PNPM_HOME 을 두어야 store 가 /pnpm/store 가 되고 아래 BuildKit 캐시 마운트가 실제로 동작한다.
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
# corepack enable 만 하면 최신 pnpm(11.x)을 받으므로 packageManager 와 동일 버전으로 고정.
RUN corepack enable && corepack prepare pnpm@10.34.3 --activate
WORKDIR /repo

# ---------- build ----------
FROM base AS build

# 1) 매니페스트만 먼저 복사해 의존성 설치 레이어 캐싱
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
# tsconfig 패키지는 package.json 만이 아니라 통째로 복사한다.
# .npmrc 의 inject-workspace-packages=true 는 워크스페이스 의존성을 심볼릭 링크가 아니라
# "복사"하므로, install 시점에 없는 파일(base.json)은 나중에 COPY . . 를 해도 주입본에 반영되지
# 않는다 → prisma generate / nest build 가 '@tripic/tsconfig/base.json' 을 못 찾는다.
COPY packages/tsconfig/ packages/tsconfig/
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# 2) 소스 복사 후 빌드
COPY . .
# api 가 의존하는 workspace 패키지(@tripic/shared)의 dist 를 먼저 만든다 (deploy 산출물에도 포함됨)
RUN pnpm --filter @tripic/shared build
# 주입(inject-workspace-packages)된 @tripic/shared 복사본은 위 빌드 산출물을 자동으로 받지 않는다.
# 재설치로 주입본을 갱신해야 api 가 dist/index.d.ts 를 찾는다 (네트워크 없이 store 에서 복원).
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --offline
# Prisma client 를 src/generated 에 생성 (Prisma 7: Rust 엔진 없음, SWC 가 dist 로 함께 컴파일)
# generate 는 DB 에 접속하지 않지만 prisma.config.ts 가 DATABASE_URL 존재를 요구하므로 빌드용 더미를 준다
RUN DATABASE_URL="postgresql://build:build@127.0.0.1:1/build" pnpm --filter @tripic/api db:generate
RUN pnpm --filter @tripic/api build

# 3) prod 의존성만 추린 배포 산출물 생성 (node_modules + package.json)
#    inject-workspace-packages=true (.npmrc) 기반 modern deploy
RUN pnpm --filter @tripic/api --prod deploy /repo/deploy

# ---------- runtime (lean: pnpm/corepack 불필요) ----------
FROM node:24.18.0-alpine3.24 AS runtime
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app

# base image 태그는 node 버전 고정을 위해 유지하되, 그 안의 alpine 패키지는 최신 패치로 올린다.
# 태그가 고정돼 있으면 base 가 재빌드돼도 갱신분을 못 받아 이미 패치된 OS CVE 를 계속 끌고 다닌다
# (예: CVE-2026-14456 libcrypto3/libssl3 3.5.7-r0 → 3.5.8-r0). CI 의 Trivy 이미지 스캔은
# "수정본이 있는 HIGH/CRITICAL" 을 차단하므로 여기서 미리 올려둔다.
RUN apk upgrade --no-cache

# 런타임은 node 바이너리만 쓴다(CMD 가 node 직접 실행). 이미지 내장 npm/corepack/yarn 은
# 사용하지 않으면서 자체 의존성이 이미지 스캔에 잡히므로(npm 번들 brace-expansion 5.0.6 →
# GHSA-mh99-v99m-4gvg 등) 제거해 공격 표면과 오탐을 함께 줄인다. COPY 앞에 두어 레이어를 캐싱한다.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
    /opt/yarn-v* /usr/local/bin/yarn /usr/local/bin/yarnpkg

ARG APP_VERSION
ARG COMMIT_SHA
ENV APP_VERSION=${APP_VERSION:-}
ENV COMMIT_SHA=${COMMIT_SHA:-}
LABEL org.opencontainers.image.title="tripic-api" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${COMMIT_SHA}"

# node 이미지 내장 비루트 사용자 'node' 로 실행
COPY --from=build --chown=node:node /repo/deploy/node_modules ./node_modules
COPY --from=build --chown=node:node /repo/deploy/package.json ./package.json
COPY --from=build --chown=node:node /repo/apps/api/dist ./dist

USER node
EXPOSE 3000

# Health check 는 이미지에 두지 않는다.
# Northflank(쿠버네티스 기반)는 Docker HEALTHCHECK 를 무시하고 플랫폼 probe 를 사용하므로,
# Northflank 설정에서 HTTP liveness/readiness probe 를 GET /health 로 지정한다.
CMD ["node", "dist/src/main.js"]

# DB 마이그레이션 이미지는 이 파일에 두지 않는다 — apps/api/Dockerfile.migrate 참고.
