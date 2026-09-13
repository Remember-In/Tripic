import { describe, expect, it } from "vitest";
import { ServiceUnavailableException } from "@nestjs/common";
import { DisabledAppleLoginAdapter } from "@/auth/adapters/disabled-apple-login.adapter";

/** Apple 설정이 없는 서버에서 Apple 포트 자리에 들어가는 adapter (docs/14 §7.1) */
describe("DisabledAppleLoginAdapter", () => {
  const adapter = new DisabledAppleLoginAdapter();

  it("identity token 검증은 503 — Apple 가입·로그인을 막는다", async () => {
    await expect(adapter.verifyIdentityToken("token")).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it("서버 알림 검증도 503 — Apple 이 재시도하도록 성공으로 답하지 않는다", async () => {
    await expect(adapter.verifyNotification("payload")).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it("code 교환과 revoke 도 503", async () => {
    await expect(
      adapter.exchangeAuthorizationCode("code"),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(adapter.revokeRefreshToken("token")).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it("저장된 Apple 토큰을 암복호화할 수 없다 — 탈퇴 시 revoke 없이 삭제되는 일을 막는다", () => {
    expect(() => adapter.encrypt("token")).toThrow(ServiceUnavailableException);
    expect(() => adapter.decrypt("v1.a.b.c")).toThrow(
      ServiceUnavailableException,
    );
  });
});
