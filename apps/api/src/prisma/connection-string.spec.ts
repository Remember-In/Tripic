import { describe, expect, it } from "vitest";
import { pinSslMode } from "@/prisma/connection-string";

/**
 * pg 는 `require`·`prefer`·`verify-ca` 를 지금은 `verify-full` 로 취급하지만,
 * 다음 메이저에서 libpq 의미(인증서·호스트명 검증 없음)로 바뀐다고 경고한다.
 * 값을 그대로 두면 라이브러리 업그레이드만으로 검증이 조용히 약해지므로 여기서 못박는다.
 */
describe("pinSslMode", () => {
  it.each(["require", "prefer", "verify-ca"])(
    "모호한 sslmode=%s 를 verify-full 로 고정한다",
    (mode) => {
      const pinned = pinSslMode(
        `postgresql://u:p@db.example:5432/tripic?schema=public&sslmode=${mode}`,
      );

      expect(new URL(pinned).searchParams.get("sslmode")).toBe("verify-full");
    },
  );

  it("이미 verify-full 이면 그대로 둔다", () => {
    const original =
      "postgresql://u:p@db.example:5432/tripic?sslmode=verify-full";

    expect(pinSslMode(original)).toBe(original);
  });

  /** 검증을 끄겠다고 명시한 값은 존중한다 — 몰래 조여서 연결을 끊지 않는다 */
  it.each(["disable", "no-verify"])("%s 는 건드리지 않는다", (mode) => {
    const original = `postgresql://u:p@db.example:5432/tripic?sslmode=${mode}`;

    expect(pinSslMode(original)).toBe(original);
  });

  it("libpq 호환을 명시했으면 존중한다", () => {
    const original =
      "postgresql://u:p@db.example:5432/tripic?uselibpqcompat=true&sslmode=require";

    expect(pinSslMode(original)).toBe(original);
  });

  it("sslmode 가 없으면 붙이지 않는다 — TLS 없는 로컬 DB 를 깨뜨리지 않는다", () => {
    const original = "postgresql://tripic:tripic@localhost:48291/tripic";

    expect(pinSslMode(original)).toBe(original);
  });

  it("다른 쿼리 파라미터를 잃지 않는다", () => {
    const pinned = new URL(
      pinSslMode(
        "postgresql://u:p@db.example:5432/tripic?schema=public&sslmode=require&connection_limit=5",
      ),
    );

    expect(pinned.searchParams.get("schema")).toBe("public");
    expect(pinned.searchParams.get("connection_limit")).toBe("5");
  });

  it("비밀번호의 특수문자를 망가뜨리지 않는다", () => {
    const pinned = pinSslMode(
      "postgresql://u:p%40ss%3Aword@db.example:5432/tripic?sslmode=require",
    );

    expect(new URL(pinned).password).toBe("p%40ss%3Aword");
  });

  it("URL 로 해석되지 않는 값은 손대지 않는다", () => {
    const original = "not a url";

    expect(pinSslMode(original)).toBe(original);
  });
});
