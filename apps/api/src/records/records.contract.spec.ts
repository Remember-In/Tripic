import { describe, expect, it } from "vitest";
import {
  createRecordSchema,
  entryDateSchema,
  updateRecordSchema,
  upsertEntrySchema,
} from "@tripic/shared";

/**
 * 요청 계약(@tripic/shared)의 경계값을 고정한다.
 * 라우트는 이 스키마를 그대로 쓰므로 여기서 통과/거부가 곧 400 여부가 된다.
 */
describe("기록 요청 계약", () => {
  describe("createRecordSchema", () => {
    it("제목만 있어도 통과하고 해시태그는 빈 배열로 채워진다", () => {
      const parsed = createRecordSchema.parse({ title: "경주 여행" });

      expect(parsed.hashtags).toEqual([]);
      expect(parsed.theme).toBeUndefined();
    });

    it("제목 앞뒤 공백은 다듬는다", () => {
      expect(createRecordSchema.parse({ title: "  경주  " }).title).toBe(
        "경주",
      );
    });

    it("빈 제목·공백뿐인 제목은 거부한다", () => {
      expect(createRecordSchema.safeParse({ title: "" }).success).toBe(false);
      expect(createRecordSchema.safeParse({ title: "   " }).success).toBe(
        false,
      );
    });

    it("제목은 50자까지", () => {
      expect(
        createRecordSchema.safeParse({ title: "가".repeat(50) }).success,
      ).toBe(true);
      expect(
        createRecordSchema.safeParse({ title: "가".repeat(51) }).success,
      ).toBe(false);
    });

    it("해시태그는 10개까지, 각 30자까지", () => {
      const tags = (count: number, length = 3) =>
        Array.from({ length: count }, () => "#".padEnd(length, "가"));

      expect(
        createRecordSchema.safeParse({ title: "여행", hashtags: tags(10) })
          .success,
      ).toBe(true);
      expect(
        createRecordSchema.safeParse({ title: "여행", hashtags: tags(11) })
          .success,
      ).toBe(false);
      expect(
        createRecordSchema.safeParse({ title: "여행", hashtags: tags(1, 31) })
          .success,
      ).toBe(false);
    });

    it("정의되지 않은 테마·문체 값은 거부한다", () => {
      expect(
        createRecordSchema.safeParse({ title: "여행", theme: "NOPE" }).success,
      ).toBe(false);
      expect(
        createRecordSchema.safeParse({ title: "여행", style: "NOPE" }).success,
      ).toBe(false);
    });
  });

  describe("updateRecordSchema", () => {
    it("빈 객체도 통과한다 (바꿀 게 없는 요청)", () => {
      expect(updateRecordSchema.safeParse({}).success).toBe(true);
    });

    it("theme·style 에는 null 을 허용한다 (해제)", () => {
      const parsed = updateRecordSchema.parse({ theme: null, style: null });

      expect(parsed.theme).toBeNull();
      expect(parsed.style).toBeNull();
    });

    it("title 에는 null 을 허용하지 않는다", () => {
      expect(updateRecordSchema.safeParse({ title: null }).success).toBe(false);
    });
  });

  describe("entryDateSchema", () => {
    it("YYYY-MM-DD 형식만 통과한다", () => {
      expect(entryDateSchema.safeParse("2026-08-15").success).toBe(true);
      expect(entryDateSchema.safeParse("2026-8-15").success).toBe(false);
      expect(entryDateSchema.safeParse("20260815").success).toBe(false);
      expect(entryDateSchema.safeParse("2026-08-15T00:00:00Z").success).toBe(
        false,
      );
    });

    it("달력에 없는 날짜는 거부한다", () => {
      expect(entryDateSchema.safeParse("2026-02-30").success).toBe(false);
      expect(entryDateSchema.safeParse("2026-13-01").success).toBe(false);
      expect(entryDateSchema.safeParse("2026-00-10").success).toBe(false);
    });

    it("윤년 2월 29일은 해에 따라 갈린다", () => {
      expect(entryDateSchema.safeParse("2028-02-29").success).toBe(true);
      expect(entryDateSchema.safeParse("2026-02-29").success).toBe(false);
    });
  });

  describe("upsertEntrySchema", () => {
    it("본문과 작성 주체가 모두 필요하다", () => {
      expect(
        upsertEntrySchema.safeParse({ content: "일기", source: "USER" })
          .success,
      ).toBe(true);
      expect(upsertEntrySchema.safeParse({ content: "일기" }).success).toBe(
        false,
      );
      expect(upsertEntrySchema.safeParse({ source: "USER" }).success).toBe(
        false,
      );
    });

    it("본문은 5000자까지, 빈 본문은 거부", () => {
      expect(
        upsertEntrySchema.safeParse({
          content: "가".repeat(5000),
          source: "AI",
        }).success,
      ).toBe(true);
      expect(
        upsertEntrySchema.safeParse({
          content: "가".repeat(5001),
          source: "AI",
        }).success,
      ).toBe(false);
      expect(
        upsertEntrySchema.safeParse({ content: "   ", source: "AI" }).success,
      ).toBe(false);
    });

    it("작성 주체는 USER/AI 만 허용한다", () => {
      expect(
        upsertEntrySchema.safeParse({ content: "일기", source: "BOT" }).success,
      ).toBe(false);
    });
  });
});
