import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";

const srcDir = fileURLToPath(new URL("./src", import.meta.url));

// e2e 테스트 (test/**/*.e2e-spec.ts). 부팅된 Nest 앱을 pactum 으로 HTTP 호출.
export default defineConfig({
  test: {
    root: "./",
    include: ["test/**/*.e2e-spec.ts"],
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
