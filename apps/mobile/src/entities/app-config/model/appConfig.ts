export type KtoAppConfig = Readonly<{
  defaultRadiusM: number;
  maxCandidates: number;
  maxRadiusM: number;
}>;

export type AppFeatures = Readonly<{
  aiDiary: boolean;
  photoUpload: boolean;
}>;

export type AppConfig = Readonly<{
  features: AppFeatures;
  kto: KtoAppConfig;
}>;

export const DEFAULT_APP_CONFIG: AppConfig = {
  features: {
    aiDiary: false,
    photoUpload: true,
  },
  kto: {
    defaultRadiusM: 300,
    maxCandidates: 5,
    maxRadiusM: 1_000,
  },
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function positiveIntegerOr(value: unknown, fallback: number): number {
  return Number.isSafeInteger(value) && (value as number) > 0
    ? (value as number)
    : fallback;
}

/**
 * 서버가 아직 빈 객체를 반환하거나 일부 필드만 제공해도 앱에서 사용할 수 있는
 * 완전한 설정으로 정규화한다.
 */
export function normalizeAppConfig(value: unknown): AppConfig {
  const root = asRecord(value);
  const kto = asRecord(root?.kto);
  const features = asRecord(root?.features);

  return {
    features: {
      // 미완성 기능은 서버가 명시적으로 true를 보낼 때만 활성화한다.
      aiDiary: features?.aiDiary === true,
      // 사진 업로드는 기존 앱 동작을 유지하고 명시적인 false만 존중한다.
      photoUpload: features?.photoUpload !== false,
    },
    kto: {
      defaultRadiusM: positiveIntegerOr(
        kto?.defaultRadiusM,
        DEFAULT_APP_CONFIG.kto.defaultRadiusM,
      ),
      maxCandidates: positiveIntegerOr(
        kto?.maxCandidates,
        DEFAULT_APP_CONFIG.kto.maxCandidates,
      ),
      maxRadiusM: positiveIntegerOr(
        kto?.maxRadiusM,
        DEFAULT_APP_CONFIG.kto.maxRadiusM,
      ),
    },
  };
}
