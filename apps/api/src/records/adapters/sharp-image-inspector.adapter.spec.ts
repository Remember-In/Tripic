import { beforeAll, describe, expect, it } from "vitest";
import sharp from "sharp";
import { SharpImageInspectorAdapter } from "@/records/adapters/sharp-image-inspector.adapter";
import { ImageRejected } from "@/records/ports/image-inspector.port";

const solid = (width: number, height: number) =>
  sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 10, g: 120, b: 200 },
    },
  });

/** 위치 메타데이터 차단이 목적이므로 통과 조건보다 거부 조건을 촘촘히 본다 */
describe("SharpImageInspectorAdapter", () => {
  const inspector = new SharpImageInspectorAdapter();
  let jpeg: Buffer;
  let webp: Buffer;

  beforeAll(async () => {
    jpeg = await solid(40, 30).jpeg().toBuffer();
    webp = await solid(40, 30).webp().toBuffer();
  });

  const reasonOf = async (data: Buffer): Promise<string> => {
    try {
      await inspector.inspect(data);
      return "통과함";
    } catch (error) {
      return error instanceof ImageRejected ? error.reason : "다른 예외";
    }
  };

  it("메타데이터 없는 jpeg 를 통과시키고 크기를 알려준다", async () => {
    await expect(inspector.inspect(jpeg)).resolves.toEqual({
      mimeType: "image/jpeg",
      width: 40,
      height: 30,
    });
  });

  it("webp 도 허용한다", async () => {
    await expect(inspector.inspect(webp)).resolves.toMatchObject({
      mimeType: "image/webp",
    });
  });

  it("이미지가 아니면 NOT_AN_IMAGE", async () => {
    await expect(reasonOf(Buffer.from("그냥 텍스트"))).resolves.toBe(
      "NOT_AN_IMAGE",
    );
  });

  it("헤더만 이미지인 척하는 바이트도 거부한다", async () => {
    const fake = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      Buffer.from("자른 뒤 남은 쓰레기"),
    ]);

    await expect(reasonOf(fake)).resolves.toBe("NOT_AN_IMAGE");
  });

  it("허용하지 않는 포맷(png)은 UNSUPPORTED_FORMAT", async () => {
    const png = await solid(40, 30).png().toBuffer();

    await expect(reasonOf(png)).resolves.toBe("UNSUPPORTED_FORMAT");
  });

  it("EXIF 가 남아 있으면 HAS_METADATA", async () => {
    const withExif = await sharp(jpeg)
      .withExif({ IFD0: { Copyright: "tripic" } })
      .toBuffer();

    await expect(reasonOf(withExif)).resolves.toBe("HAS_METADATA");
  });

  it("위치정보가 아닌 ICC 색상 프로파일은 허용한다", async () => {
    const withIcc = await sharp(jpeg).withIccProfile("srgb").toBuffer();

    await expect(inspector.inspect(withIcc)).resolves.toMatchObject({
      mimeType: "image/jpeg",
    });
  });

  it("변 길이가 4096px 를 넘으면 TOO_LARGE_DIMENSIONS", async () => {
    const wide = await solid(4097, 10).jpeg().toBuffer();

    await expect(reasonOf(wide)).resolves.toBe("TOO_LARGE_DIMENSIONS");
  });

  it("4096px 정확히는 통과한다 (경계값)", async () => {
    const edge = await solid(4096, 10).jpeg().toBuffer();

    await expect(inspector.inspect(edge)).resolves.toMatchObject({
      width: 4096,
    });
  });
});
