import { execSync } from "node:child_process";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  interface ProvidedContext {
    DATABASE_URL: string;
  }
}

// docker-compose.yml 과 동일한 이미지로 고정
const POSTGRES_IMAGE = "postgres:18.2-alpine3.23";

let container: StartedPostgreSqlContainer;

/** e2e 전용 일회성 Postgres 컨테이너 기동 + 마이그레이션 적용 */
export default async function setup(project: TestProject) {
  container = await new PostgreSqlContainer(POSTGRES_IMAGE).start();
  const databaseUrl = container.getConnectionUri();

  // vitest 는 항상 apps/api 에서 실행되므로 cwd 를 그대로 상속한다 (prisma.config.ts 위치)
  execSync("pnpm prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "inherit",
  });

  // worker 의 setup-env.e2e.ts 가 inject 로 받아 process.env 에 주입한다
  project.provide("DATABASE_URL", databaseUrl);

  return async () => {
    await container.stop();
  };
}
