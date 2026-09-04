import { describe, expect, it } from "vitest";
import { NOTICES } from "@/notices/notices.data";

/** 공지는 배포로만 갱신되므로 계약(정렬·id 유일성)을 테스트로 고정한다 */
describe("NOTICES", () => {
  it("publishedAt 내림차순으로 정렬되어 있다", () => {
    const publishedAt = NOTICES.map((notice) => notice.publishedAt);
    expect(publishedAt).toEqual([...publishedAt].sort().reverse());
  });

  it("id 가 중복되지 않는다", () => {
    const ids = NOTICES.map((notice) => notice.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("publishedAt 은 파싱 가능한 ISO 8601 이다", () => {
    for (const notice of NOTICES) {
      expect(Number.isNaN(Date.parse(notice.publishedAt))).toBe(false);
    }
  });
});
