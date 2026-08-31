export type StoreUpdateUrls = Readonly<{
  android?: string;
  ios?: string;
}>;

export type AppVersionPolicy = Readonly<{
  latestVersion: string;
  minSupportedVersion: string;
  updateUrl?: StoreUpdateUrls;
}>;

export type SemverComparison = -1 | 0 | 1;

type ParsedSemver = Readonly<{
  core: readonly [string, string, string];
  prerelease: readonly string[];
}>;

const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function parseSemver(value: unknown): ParsedSemver | null {
  if (typeof value !== "string") {
    return null;
  }

  const match = SEMVER_PATTERN.exec(value);

  if (!match) {
    return null;
  }

  const prerelease = match[4]?.split(".") ?? [];
  const hasInvalidNumericIdentifier = prerelease.some(
    (identifier) => /^\d+$/.test(identifier) && /^0\d+/.test(identifier),
  );

  if (hasInvalidNumericIdentifier) {
    return null;
  }

  return {
    core: [match[1], match[2], match[3]],
    prerelease,
  };
}

function compareNumericIdentifiers(left: string, right: string) {
  if (left.length !== right.length) {
    return left.length < right.length ? -1 : 1;
  }

  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}

function comparePrereleaseIdentifiers(left: string, right: string) {
  const isLeftNumeric = /^\d+$/.test(left);
  const isRightNumeric = /^\d+$/.test(right);

  if (isLeftNumeric && isRightNumeric) {
    return compareNumericIdentifiers(left, right);
  }

  if (isLeftNumeric !== isRightNumeric) {
    return isLeftNumeric ? -1 : 1;
  }

  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}

/** SemVer 우선순위를 비교하며, 어느 한쪽이라도 잘못된 버전이면 null을 반환한다. */
export function compareSemver(
  left: string,
  right: string,
): SemverComparison | null {
  const parsedLeft = parseSemver(left);
  const parsedRight = parseSemver(right);

  if (!parsedLeft || !parsedRight) {
    return null;
  }

  for (let index = 0; index < parsedLeft.core.length; index += 1) {
    const coreComparison = compareNumericIdentifiers(
      parsedLeft.core[index],
      parsedRight.core[index],
    );

    if (coreComparison !== 0) {
      return coreComparison;
    }
  }

  if (parsedLeft.prerelease.length === 0) {
    return parsedRight.prerelease.length === 0 ? 0 : 1;
  }

  if (parsedRight.prerelease.length === 0) {
    return -1;
  }

  const identifierCount = Math.max(
    parsedLeft.prerelease.length,
    parsedRight.prerelease.length,
  );

  for (let index = 0; index < identifierCount; index += 1) {
    const leftIdentifier = parsedLeft.prerelease[index];
    const rightIdentifier = parsedRight.prerelease[index];

    if (leftIdentifier === undefined) {
      return -1;
    }

    if (rightIdentifier === undefined) {
      return 1;
    }

    const prereleaseComparison = comparePrereleaseIdentifiers(
      leftIdentifier,
      rightIdentifier,
    );

    if (prereleaseComparison !== 0) {
      return prereleaseComparison;
    }
  }

  return 0;
}

function readStoreUrl(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? value : undefined;
  } catch {
    return undefined;
  }
}

/** 핵심 버전 값이 유효하지 않으면 null을 반환해 업데이트 차단을 적용하지 않는다. */
export function normalizeAppVersion(value: unknown): AppVersionPolicy | null {
  const root = asRecord(value);

  if (!root) {
    return null;
  }

  const latestVersion = root.latestVersion;
  const minSupportedVersion = root.minSupportedVersion;

  if (
    typeof latestVersion !== "string" ||
    typeof minSupportedVersion !== "string"
  ) {
    return null;
  }

  const policyOrder = compareSemver(minSupportedVersion, latestVersion);

  if (policyOrder === null || policyOrder === 1) {
    return null;
  }

  const rawUpdateUrl = asRecord(root.updateUrl);
  const android = readStoreUrl(rawUpdateUrl?.android);
  const ios = readStoreUrl(rawUpdateUrl?.ios);
  const updateUrl =
    android || ios
      ? {
          ...(android ? { android } : {}),
          ...(ios ? { ios } : {}),
        }
      : undefined;

  return {
    latestVersion,
    minSupportedVersion,
    ...(updateUrl ? { updateUrl } : {}),
  };
}
