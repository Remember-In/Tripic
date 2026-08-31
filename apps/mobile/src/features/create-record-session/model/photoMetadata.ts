import type { ImagePickerAsset } from "expo-image-picker";

import { isDateOnlyString } from "@/entities/travel-record";

import type { DraftPhoto } from "./types";

type ExifRecord = Record<string, unknown>;

function asFiniteNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function nestedExif(exif: ExifRecord, key: string) {
  const value = exif[key];
  return value && typeof value === "object" ? (value as ExifRecord) : {};
}

function readCoordinate(
  exif: ExifRecord,
  nested: ExifRecord,
  coordinateKey: "GPSLatitude" | "GPSLongitude",
  shortKey: "Latitude" | "Longitude",
) {
  return asFiniteNumber(
    exif[coordinateKey] ?? nested[coordinateKey] ?? nested[shortKey],
  );
}

function signedCoordinate(value: number, reference: unknown) {
  return reference === "S" || reference === "W" ? -Math.abs(value) : value;
}

function extractGps(exif: ExifRecord) {
  const gpsBlock = {
    ...nestedExif(exif, "GPS"),
    ...nestedExif(exif, "{GPS}"),
  };
  const latitude = readCoordinate(exif, gpsBlock, "GPSLatitude", "Latitude");
  const longitude = readCoordinate(exif, gpsBlock, "GPSLongitude", "Longitude");

  if (latitude === undefined || longitude === undefined) {
    return undefined;
  }

  return {
    latitude: signedCoordinate(
      latitude,
      exif.GPSLatitudeRef ?? gpsBlock.GPSLatitudeRef ?? gpsBlock.LatitudeRef,
    ),
    longitude: signedCoordinate(
      longitude,
      exif.GPSLongitudeRef ?? gpsBlock.GPSLongitudeRef ?? gpsBlock.LongitudeRef,
    ),
  };
}

function extractTakenDate(exif: ExifRecord) {
  const raw = exif.DateTimeOriginal ?? exif.DateTimeDigitized ?? exif.DateTime;
  if (typeof raw !== "string") {
    return undefined;
  }

  const match = raw.match(
    /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/,
  );
  if (!match) {
    return undefined;
  }

  const [, year, month, day] = match;
  const date = `${year}-${month}-${day}`;
  return isDateOnlyString(date) ? date : undefined;
}

export function createDraftPhoto(asset: ImagePickerAsset): DraftPhoto {
  const exif = asset.exif ?? {};
  const gps = extractGps(exif);

  return {
    gps,
    hasGps: Boolean(gps),
    id: `library:${asset.assetId ?? asset.uri}`,
    source: { uri: asset.uri },
    takenDate: extractTakenDate(exif),
  };
}
