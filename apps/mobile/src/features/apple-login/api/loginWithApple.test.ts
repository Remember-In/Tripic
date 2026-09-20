import { beforeEach, describe, expect, it, vi } from "vitest";

import { requestAppleCredential } from "@/features/apple-login/lib/appleGateway";
import { requestJson } from "@/shared/api";

import { loginWithApple } from "./loginWithApple";

vi.mock("@/features/apple-login/lib/appleGateway", () => ({
  requestAppleCredential: vi.fn(),
}));

vi.mock("@/shared/api", () => ({
  requestJson: vi.fn(),
}));

const requestAppleCredentialMock = vi.mocked(requestAppleCredential);
const requestJsonMock = vi.mocked(requestJson);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loginWithApple", () => {
  it("exchanges the Apple credential for a Tripic session", async () => {
    requestAppleCredentialMock.mockResolvedValue({
      authorizationCode: "authorization-code",
      identityToken: "identity-token",
    });
    requestJsonMock.mockResolvedValue({
      accessToken: "access-token",
      expiresIn: 900,
      isNewUser: false,
      refreshToken: "refresh-token",
      user: { id: "user-id", nickname: "여행자" },
    });

    await expect(loginWithApple()).resolves.toMatchObject({
      accessToken: "access-token",
      user: { id: "user-id" },
    });
    expect(requestJsonMock).toHaveBeenCalledWith("/auth/apple", {
      auth: false,
      body: {
        authorizationCode: "authorization-code",
        identityToken: "identity-token",
      },
      method: "POST",
    });
  });
});
