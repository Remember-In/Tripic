import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * 빌드는 .swcrc.build, 테스트(vitest + unplugin-swc)는 .swcrc 를 쓴다.
 * SWC 의 exclude 는 코어에서 적용돼 플러그인 옵션으로 덮을 수 없어 파일을 나눴다
 * (하나로 합치면 vitest 가 spec 파일을 "ignored by .swcrc" 로 거부한다).
 *
 * 두 파일이 exclude 말고 다른 곳에서 어긋나면 테스트와 프로덕션 산출물의
 * 컴파일 설정이 조용히 달라지므로 여기서 막는다.
 */
describe("swc 설정", () => {
  const read = (path: string): Record<string, unknown> =>
    JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;

  it("빌드용과 테스트용이 exclude 만 다르다", () => {
    const { exclude: _testExclude, ...test } = read(".swcrc");
    const { exclude: _buildExclude, ...build } = read(".swcrc.build");

    expect(build).toEqual(test);
  });

  it("빌드용만 테스트 파일을 제외한다", () => {
    expect(read(".swcrc").exclude).toBeUndefined();
    expect(read(".swcrc.build").exclude).toEqual([
      ".*\\.spec\\.ts$",
      ".*\\.e2e-spec\\.ts$",
    ]);
  });
});
