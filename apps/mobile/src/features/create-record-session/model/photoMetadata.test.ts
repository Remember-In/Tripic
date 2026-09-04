import { describe, expect, it } from "vitest";

import { extractGps, extractTakenDate } from "./photoMetadata";

describe("photo metadata", () => {
  it("applies south and west coordinate references", () => {
    expect(
      extractGps({
        GPSLatitude: 37.5,
        GPSLatitudeRef: "s",
        GPSLongitude: 127.1,
        GPSLongitudeRef: "W",
      }),
    ).toEqual({ latitude: -37.5, longitude: -127.1 });
  });

  it("rejects coordinates outside latitude and longitude bounds", () => {
    expect(extractGps({ GPSLatitude: 91, GPSLongitude: 127 })).toBeUndefined();
    expect(extractGps({ GPSLatitude: 37, GPSLongitude: 181 })).toBeUndefined();
  });

  it("normalizes common EXIF date formats without changing timezone", () => {
    expect(extractTakenDate({ DateTimeOriginal: "2026:08:11 18:05:47" })).toBe(
      "2026-08-11",
    );
    expect(
      extractTakenDate({ DateTime: "2026-02-30 10:00:00" }),
    ).toBeUndefined();
  });
});
