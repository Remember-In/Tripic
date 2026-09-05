import { beforeEach, describe, expect, it, vi } from "vitest";

import { requestJson } from "@/shared/api";

import { deleteMe } from "./userApi";

vi.mock("@/shared/api", () => ({
  requestJson: vi.fn(),
}));

const requestJsonMock = vi.mocked(requestJson);

beforeEach(() => {
  requestJsonMock.mockReset();
});

describe("deleteMe", () => {
  it("deletes the authenticated user and accepts an empty 204 response", async () => {
    requestJsonMock.mockResolvedValue(undefined);

    await expect(deleteMe()).resolves.toBeUndefined();
    expect(requestJsonMock).toHaveBeenCalledWith("/users/me", {
      auth: true,
      method: "DELETE",
    });
  });
});
