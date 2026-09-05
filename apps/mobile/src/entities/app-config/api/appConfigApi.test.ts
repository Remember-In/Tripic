import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { requestJson, type RequestJsonOptions } from "@/shared/api";

import { DEFAULT_APP_CONFIG } from "../model/appConfig";
import {
  APP_CONFIG_REQUEST_TIMEOUT_MS,
  getAppConfigOrDefault,
} from "./appConfigApi";

vi.mock("@/shared/api", () => ({
  requestJson: vi.fn(),
}));

const requestJsonMock = vi.mocked(requestJson);

function abortAwareNeverResolvingRequest(options: RequestJsonOptions) {
  return new Promise<never>((_resolve, reject) => {
    options.signal?.addEventListener(
      "abort",
      () => {
        const error = new Error("request aborted");
        error.name = "AbortError";
        reject(error);
      },
      { once: true },
    );
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  requestJsonMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getAppConfigOrDefault", () => {
  it("aborts a hanging request at the bounded timeout and settles with defaults", async () => {
    let requestSignal: AbortSignal | undefined;
    requestJsonMock.mockImplementation((_path, options = {}) => {
      requestSignal = options.signal;
      return abortAwareNeverResolvingRequest(options);
    });

    const result = getAppConfigOrDefault();
    await vi.advanceTimersByTimeAsync(APP_CONFIG_REQUEST_TIMEOUT_MS);

    await expect(result).resolves.toBe(DEFAULT_APP_CONFIG);
    expect(requestSignal?.aborted).toBe(true);
  });

  it("settles with defaults even if a hanging request ignores its abort signal", async () => {
    requestJsonMock.mockImplementation(
      () => new Promise<never>(() => undefined),
    );

    const result = getAppConfigOrDefault({ timeoutMs: 25 });
    await vi.advanceTimersByTimeAsync(25);

    await expect(result).resolves.toBe(DEFAULT_APP_CONFIG);
  });

  it("propagates an external cancellation instead of treating it as a timeout", async () => {
    const controller = new AbortController();
    const externalReason = new Error("query canceled");
    externalReason.name = "AbortError";
    let requestSignal: AbortSignal | undefined;
    requestJsonMock.mockImplementation((_path, options = {}) => {
      requestSignal = options.signal;
      return abortAwareNeverResolvingRequest(options);
    });

    const result = getAppConfigOrDefault({
      signal: controller.signal,
      timeoutMs: 25,
    });
    controller.abort(externalReason);

    await expect(result).rejects.toBe(externalReason);
    expect(requestSignal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});
