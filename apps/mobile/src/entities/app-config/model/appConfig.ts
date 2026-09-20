import {
  MAX_KTO_LIST_CANDIDATES,
  MAX_KTO_RADIUS_METERS,
} from "@/shared/api/kto";

export type KtoAppConfig = Readonly<{
  defaultRadiusM: number;
  maxCandidates: number;
  maxRadiusM: number;
}>;

export type AppFeatures = Readonly<{
  aiDiary: boolean;
  appleLogin: boolean;
  photoUpload: boolean;
}>;

export type AppConfig = Readonly<{
  features: AppFeatures;
  kto: KtoAppConfig;
}>;

export const DEFAULT_APP_CONFIG: AppConfig = {
  features: {
    aiDiary: false,
    appleLogin: false,
    photoUpload: false,
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

function candidateCountOr(value: unknown, fallback: number): number {
  return Math.min(positiveIntegerOr(value, fallback), MAX_KTO_LIST_CANDIDATES);
}

function radiusMetersOr(value: unknown, fallback: number): number {
  return Math.min(positiveIntegerOr(value, fallback), MAX_KTO_RADIUS_METERS);
}

/**
 * 서버가 아직 빈 객체를 반환하거나 일부 필드만 제공해도 앱에서 사용할 수 있는
 * 완전한 설정으로 정규화한다.
 */
export function normalizeAppConfig(value: unknown): AppConfig {
  const root = asRecord(value);
  const kto = asRecord(root?.kto);
  const features = asRecord(root?.features);
  const maxRadiusM = radiusMetersOr(
    kto?.maxRadiusM,
    DEFAULT_APP_CONFIG.kto.maxRadiusM,
  );
  const defaultRadiusM = Math.min(
    radiusMetersOr(kto?.defaultRadiusM, DEFAULT_APP_CONFIG.kto.defaultRadiusM),
    maxRadiusM,
  );

  return {
    features: {
      // 미완성 기능은 서버가 명시적으로 true를 보낼 때만 활성화한다.
      aiDiary: features?.aiDiary === true,
      appleLogin: features?.appleLogin === true,
      photoUpload: features?.photoUpload === true,
    },
    kto: {
      defaultRadiusM,
      maxCandidates: candidateCountOr(
        kto?.maxCandidates,
        DEFAULT_APP_CONFIG.kto.maxCandidates,
      ),
      maxRadiusM,
    },
  };
}
