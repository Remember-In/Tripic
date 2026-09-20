import type { ConfigService } from "@nestjs/config";
import type { Env } from "@/config/env";

/** TourAPI 프록시 adapter 가 쓰는 설정 묶음 (docs/15 §4) */
export interface TourismConfig {
  /** 쿼리에 그대로 실을 수 있는 디코딩된 서비스키 */
  serviceKey: string;
}

/**
 * 공공데이터포털은 인코딩·디코딩 두 형태의 키를 발급한다.
 * 인코딩 값을 그대로 쿼리에 실으면 이중 인코딩되어 인증에 실패하므로 한 번 되돌린다.
 * 되돌릴 수 없는 값(`%` 가 이스케이프가 아닌 경우)은 원문을 그대로 쓴다 — 키를 잃지 않는다.
 */
const decodeServiceKey = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/**
 * TourAPI env 를 설정 묶음으로 읽는다. 비운 서버면 null — 프록시 비활성 (docs/15 §4).
 */
export function readTourismConfig(
  config: ConfigService<Env, true>,
): TourismConfig | null {
  const serviceKey = config.get("KTO_SERVICE_KEY", { infer: true })?.trim();
  return serviceKey ? { serviceKey: decodeServiceKey(serviceKey) } : null;
}
