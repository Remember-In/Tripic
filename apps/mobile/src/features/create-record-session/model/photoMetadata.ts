import type { ImagePickerAsset } from "expo-image-picker";

import type { DraftPhoto } from "./types";

type ExifRecord = Record<string, unknown>;

function isValidCalendarDate(value: string) {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

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
  const normalizedReference =
    typeof reference === "string" ? reference.trim().toUpperCase() : reference;

  return normalizedReference === "S" || normalizedReference === "W"
    ? -Math.abs(value)
    : value;
}

export function extractGps(exif: ExifRecord) {
  const gpsBlock = {
    ...nestedExif(exif, "GPS"),
    ...nestedExif(exif, "{GPS}"),
  };
  const latitude = readCoordinate(exif, gpsBlock, "GPSLatitude", "Latitude");
  const longitude = readCoordinate(exif, gpsBlock, "GPSLongitude", "Longitude");

  if (latitude === undefined || longitude === undefined) {
    return undefined;
  }

  const signedLatitude = signedCoordinate(
    latitude,
    exif.GPSLatitudeRef ?? gpsBlock.GPSLatitudeRef ?? gpsBlock.LatitudeRef,
  );
  const signedLongitude = signedCoordinate(
    longitude,
    exif.GPSLongitudeRef ?? gpsBlock.GPSLongitudeRef ?? gpsBlock.LongitudeRef,
  );

  if (
    signedLatitude < -90 ||
    signedLatitude > 90 ||
    signedLongitude < -180 ||
    signedLongitude > 180
  ) {
    return undefined;
  }

  return { latitude: signedLatitude, longitude: signedLongitude };
}

export function extractTakenDate(exif: ExifRecord) {
  const raw = exif.DateTimeOriginal ?? exif.DateTimeDigitized ?? exif.DateTime;
  if (typeof raw !== "string") {
    return undefined;
  }

  const match = raw.match(/^(\d{4})[:-](\d{2})[:-](\d{2})(?:[ T]|$)/);
  if (!match) {
    return undefined;
  }

  const [, year, month, day] = match;
  const date = `${year}-${month}-${day}`;
  return isValidCalendarDate(date) ? date : undefined;
}

export function createDraftPhoto(asset: ImagePickerAsset): DraftPhoto {
  const exif = asset.exif ?? {};
  const gps = extractGps(exif);

  return {
    assetId: asset.assetId ?? undefined,
    gps,
    hasGps: Boolean(gps),
    height: asset.height,
    id: `library:${asset.assetId ?? asset.uri}`,
    source: { uri: asset.uri },
    takenDate: extractTakenDate(exif),
    uri: asset.uri,
    width: asset.width,
  };
}
