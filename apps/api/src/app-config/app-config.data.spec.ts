import { generateKeyPairSync, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ConfigService } from "@nestjs/config";
import {
  DEFAULT_RADIUS_M,
  EXPANDED_RADIUS_M,
  MAX_CANDIDATES,
} from "@tripic/shared";
import { buildAppConfig } from "@/app-config/app-config.data";
import { validateEnv, type Env } from "@/config/env";

const applePrivateKey = generateKeyPairSync("ec", {
  namedCurve: "prime256v1",
}).privateKey.export({ format: "pem", type: "pkcs8" });

/** 부팅 경로와 동일하게 env 검증을 통과시킨 뒤 ConfigService 로 감싼다 */
const configOf = (
  overrides: Record<string, string>,
): ConfigService<Env, true> =>
  new ConfigService<Env, true>(
    validateEnv({
      DATABASE_URL: "postgresql://x:x@127.0.0.1:5432/x",
      JWT_ACCESS_SECRET: "0123456789abcdef0123456789abcdef",
      KAKAO_APP_ID: "123456",
      APPLE_CLIENT_ID: "com.tripic.app",
      APPLE_TEAM_ID: "TEAM123456",
      APPLE_KEY_ID: "KEY1234567",
      APPLE_PRIVATE_KEY: applePrivateKey,
      SOCIAL_TOKEN_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
      ...overrides,
    }),
  );

const appConfigOf = (overrides: Record<string, string>) =>
  buildAppConfig(configOf(overrides));

/** Apple env 5종을 모두 비운 서버 (docs/14 §7.1) */
const configWithoutApple = (): ConfigService<Env, true> =>
  new ConfigService<Env, true>(
    validateEnv({
      DATABASE_URL: "postgresql://x:x@127.0.0.1:5432/x",
      JWT_ACCESS_SECRET: "0123456789abcdef0123456789abcdef",
      KAKAO_APP_ID: "123456",
    }),
  );

describe("buildAppConfig", () => {
  describe("기본값", () => {
    it("환경변수가 없으면 앱과 공유하는 상수를 그대로 쓴다", () => {
      expect(appConfigOf({})).toEqual({
        kto: {
          defaultRadiusM: DEFAULT_RADIUS_M,
          maxRadiusM: EXPANDED_RADIUS_M,
          maxCandidates: MAX_CANDIDATES,
        },
        features: { aiDiary: false, photoUpload: true, appleLogin: true },
      });
    });

    it("Apple 설정이 없으면 appleLogin 은 false — 앱이 Apple 버튼을 숨긴다", () => {
      expect(buildAppConfig(configWithoutApple()).features.appleLogin).toBe(
        false,
      );
    });

    it("빈 문자열은 미설정과 다르게 취급한다 — 부팅을 막는다", () => {
      // 배포 환경에서 값을 지운다고 빈 문자열을 넣는 실수를 잡아낸다
      expect(() => configOf({ KTO_DEFAULT_RADIUS_M: "" })).toThrow();
      expect(() => configOf({ FEATURE_PHOTO_UPLOAD: "" })).toThrow();
    });
  });

  describe("반경·후보 수 오버라이드 (성공)", () => {
    it("세 값을 한꺼번에 바꾼다", () => {
      expect(
        appConfigOf({
          KTO_DEFAULT_RADIUS_M: "500",
          KTO_MAX_RADIUS_M: "2000",
          KTO_MAX_CANDIDATES: "8",
        }).kto,
      ).toEqual({ defaultRadiusM: 500, maxRadiusM: 2000, maxCandidates: 8 });
    });

    it("일부만 바꾸면 나머지는 기본값을 유지한다", () => {
      expect(appConfigOf({ KTO_MAX_CANDIDATES: "3" }).kto).toEqual({
        defaultRadiusM: DEFAULT_RADIUS_M,
        maxRadiusM: EXPANDED_RADIUS_M,
        maxCandidates: 3,
      });
    });

    it("문자열로 들어와도 숫자로 변환한다", () => {
      const { kto } = appConfigOf({ KTO_DEFAULT_RADIUS_M: "450" });

      expect(kto.defaultRadiusM).toBe(450);
      expect(typeof kto.defaultRadiusM).toBe("number");
    });

    it("최소값 1 도 허용한다 (경계값)", () => {
      expect(appConfigOf({ KTO_MAX_CANDIDATES: "1" }).kto.maxCandidates).toBe(
        1,
      );
    });

    it("앞뒤 공백이 있어도 읽는다", () => {
      expect(appConfigOf({ KTO_MAX_RADIUS_M: " 1500 " }).kto.maxRadiusM).toBe(
        1500,
      );
    });
  });

  describe("반경·후보 수 오버라이드 (실패 — 부팅 차단)", () => {
    it.each([
      ["숫자가 아님", { KTO_DEFAULT_RADIUS_M: "안녕" }],
      ["0", { KTO_MAX_CANDIDATES: "0" }],
      ["음수", { KTO_MAX_RADIUS_M: "-100" }],
      ["소수", { KTO_DEFAULT_RADIUS_M: "300.5" }],
      ["단위 포함", { KTO_DEFAULT_RADIUS_M: "300m" }],
      ["빈 배열 표기", { KTO_MAX_CANDIDATES: "[]" }],
    ])("%s 이면 부팅에 실패한다", (_label, overrides) => {
      expect(() => configOf(overrides)).toThrow();
    });

    it("실패는 검증 단계에서 나므로 잘못된 값이 응답까지 가지 않는다", () => {
      expect(() => appConfigOf({ KTO_MAX_CANDIDATES: "0" })).toThrow();
    });
  });

  describe("기능 플래그 (성공)", () => {
    it("true/false 문자열을 읽는다", () => {
      expect(
        appConfigOf({ FEATURE_AI_DIARY: "true", FEATURE_PHOTO_UPLOAD: "false" })
          .features,
      ).toEqual({ aiDiary: true, photoUpload: false, appleLogin: true });
    });

    it("플래그를 각각 독립적으로 켜고 끈다", () => {
      expect(appConfigOf({ FEATURE_AI_DIARY: "true" }).features).toEqual({
        aiDiary: true,
        photoUpload: true,
        appleLogin: true,
      });
      expect(appConfigOf({ FEATURE_PHOTO_UPLOAD: "false" }).features).toEqual({
        aiDiary: false,
        photoUpload: false,
        appleLogin: true,
      });
    });

    it("플래그만 바꿔도 반경 값은 그대로다", () => {
      const config = appConfigOf({ FEATURE_AI_DIARY: "true" });

      expect(config.features.aiDiary).toBe(true);
      expect(config.kto.defaultRadiusM).toBe(DEFAULT_RADIUS_M);
    });

    it("사진 업로드는 서버에 API 가 있으므로 기본이 켜짐이다", () => {
      expect(appConfigOf({}).features.photoUpload).toBe(true);
    });

    it("AI 일기는 구현하지 않기로 했으므로 기본이 꺼짐이다", () => {
      expect(appConfigOf({}).features.aiDiary).toBe(false);
    });
  });

  describe("기능 플래그 (실패 — 부팅 차단)", () => {
    // 표기를 true/false 로 좁힌 이유: 여러 표기를 받아주면 배포마다 표기가 갈리고,
    // 나중에 값을 읽는 사람이 "on 은 켜진 건가" 를 매번 확인해야 한다.
    it.each([
      ["yes", { FEATURE_AI_DIARY: "yes" }],
      ["on", { FEATURE_PHOTO_UPLOAD: "on" }],
      ["enabled", { FEATURE_AI_DIARY: "enabled" }],
      ["1", { FEATURE_AI_DIARY: "1" }],
      ["0", { FEATURE_PHOTO_UPLOAD: "0" }],
    ])("%s 처럼 흔한 대체 표기도 받지 않는다", (_label, overrides) => {
      expect(() => configOf(overrides)).toThrow();
    });

    it("대소문자가 다르면 거부한다 — 표기를 하나로 고정한다", () => {
      expect(() => configOf({ FEATURE_AI_DIARY: "True" })).toThrow();
      expect(() => configOf({ FEATURE_PHOTO_UPLOAD: "FALSE" })).toThrow();
    });

    it.each([
      ["오타", { FEATURE_PHOTO_UPLOAD: "ture" }],
      ["아무 말", { FEATURE_PHOTO_UPLOAD: "아마도" }],
      ["공백", { FEATURE_AI_DIARY: " " }],
    ])("%s 이면 부팅에 실패한다", (_label, overrides) => {
      expect(() => configOf(overrides)).toThrow();
    });
  });

  describe("응답 형태", () => {
    it("계약에 없는 키를 덧붙이지 않는다", () => {
      const config = appConfigOf({});

      expect(Object.keys(config).sort()).toEqual(["features", "kto"]);
      expect(Object.keys(config.kto).sort()).toEqual([
        "defaultRadiusM",
        "maxCandidates",
        "maxRadiusM",
      ]);
      expect(Object.keys(config.features).sort()).toEqual([
        "aiDiary",
        "appleLogin",
        "photoUpload",
      ]);
    });

    it("호출할 때마다 같은 값을 돌려준다 (정적 서빙)", () => {
      const config = configOf({ KTO_DEFAULT_RADIUS_M: "400" });

      expect(buildAppConfig(config)).toEqual(buildAppConfig(config));
    });
  });
});
