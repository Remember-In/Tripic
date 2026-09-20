import { DisabledTourApiAdapter } from "@/tourism/adapters/disabled-tour-api.adapter";
import { KtoApiAdapter } from "@/tourism/adapters/kto-api.adapter";
import type { KtoClient } from "@/tourism/ports/kto-client.port";
import type { TourismConfig } from "@/config/tourism-config";

/**
 * TourAPI 설정 여부에 따라 포트에 연결할 adapter 를 고른다 (docs/15 §4).
 * 확장은 provider 배선으로 — TourismService 는 어느 adapter 가 붙었는지 모른다.
 */
export const selectKtoClient = (tourism: TourismConfig | null): KtoClient =>
  tourism ? new KtoApiAdapter(tourism) : new DisabledTourApiAdapter();
