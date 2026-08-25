import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";

const srcDir = fileURLToPath(new URL("./src", import.meta.url));

// e2e 테스트 (test/**/*.e2e-spec.ts). 부팅된 Nest 앱을 pactum 으로 HTTP 호출.
// DB 는 globalSetup 이 Testcontainers 로 일회성 Postgres 를 띄운다 (Docker 필요).
export default defineConfig({
  test: {
    root: "./",
    include: ["test/**/*.e2e-spec.ts"],
    alias: { "@": srcDir },
    globalSetup: ["./test/global-setup.e2e.ts"],
    setupFiles: ["./test/setup-env.e2e.ts"],
    // ConfigModule validate(envSchema) 를 통과하기 위한 e2e 고정값
    env: {
      JWT_ACCESS_SECRET: "e2e-test-secret-0123456789abcdef0123456789abcdef",
      JWT_ACCESS_TTL_SEC: "900",
      JWT_REFRESH_TTL_DAYS: "30",
      KAKAO_APP_ID: "123456",
    },
    testTimeout: 30_000,
    // 최초 실행 시 postgres 이미지 pull 대비
    hookTimeout: 120_000,
  },
  resolve: {
    alias: { "@": srcDir },
  },
  plugins: [
    swc.vite({
      jsc: {
        parser: { syntax: "typescript", decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
});
