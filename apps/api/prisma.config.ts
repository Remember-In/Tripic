import { defineConfig, env } from "prisma/config";

// Prisma 7: datasource url은 schema.prisma가 아닌 이 파일에서 관리한다.
// .env는 자동 로드되지 않으므로 node 내장 loadEnvFile 사용 (CI처럼 env가 직접 주입되면 파일이 없어도 무방).
// 이미 주입된 DATABASE_URL(e2e Testcontainers 등)이 .env 값에 덮이지 않도록 가드한다.
if (!process.env.DATABASE_URL) {
  try {
    process.loadEnvFile();
  } catch {
    // .env 파일 없음 — 주입된 환경변수를 그대로 사용
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
