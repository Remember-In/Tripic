import { describe, expect, it } from "vitest";
import { ConfigService } from "@nestjs/config";
import { HealthController } from "@/health/health.controller";
import { validateEnv, type Env } from "@/config/env";

const baseEnv = {
  DATABASE_URL: "postgresql://x:x@127.0.0.1:5432/x",
  JWT_ACCESS_SECRET: "0123456789abcdef0123456789abcdef",
  KAKAO_APP_ID: "123456",
};

const controllerWith = (overrides: Record<string, string> = {}) =>
  new HealthController(
    new ConfigService<Env, true>(validateEnv({ ...baseEnv, ...overrides })),
  );

/**
 * 배포된 빌드를 밖에서 확인할 방법이 없으면, 라우트 목록 같은 간접 증거로 버전을 추측하게 된다.
 * 라우트가 늘지 않는 패치 릴리스는 그 방법으로 구분되지 않는다.
 */
describe("HealthController", () => {
  it("상태를 돌려준다", () => {
    expect(controllerWith().check().status).toBe("ok");
  });

  it("이미지에 새겨진 버전과 커밋을 함께 돌려준다", () => {
    const body = controllerWith({
      APP_VERSION: "1.3.1",
      COMMIT_SHA: "abc1234",
    }).check();

    expect(body.version).toBe("1.3.1");
    expect(body.commit).toBe("abc1234");
  });

  it("빌드 인자 없이 띄운 로컬에서는 null 이다 — 키를 빠뜨리지 않는다", () => {
    const body = controllerWith().check();

    expect(body.version).toBeNull();
    expect(body.commit).toBeNull();
  });
});
