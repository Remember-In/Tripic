import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";

const srcDir = fileURLToPath(new URL("./src", import.meta.url));

// 단위 테스트 (src/**/*.spec.ts). NestJS DI 메타데이터를 위해 SWC 데코레이터 변환 사용.
export default defineConfig({
  test: {
    root: "./",
    include: ["src/**/*.spec.ts"],
    passWithNoTests: true,
    alias: { "@": srcDir },
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
