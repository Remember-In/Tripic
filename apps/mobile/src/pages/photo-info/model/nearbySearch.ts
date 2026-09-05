import type { KtoAreaCode } from "@/entities/region";
import type { LocationSearchDecision } from "@/features/create-record-session";

type NearbySearchReadiness = Readonly<{
  hasCoordinates: boolean;
  isAppConfigPending: boolean;
  isKeywordMode: boolean;
  locationSearchDecision: LocationSearchDecision;
  selectedAreaCode: KtoAreaCode | null | undefined;
}>;

export function canStartNearbySearch({
  hasCoordinates,
  isAppConfigPending,
  isKeywordMode,
  locationSearchDecision,
  selectedAreaCode,
}: NearbySearchReadiness) {
  return (
    !isAppConfigPending &&
    locationSearchDecision === "nearby" &&
    !isKeywordMode &&
    selectedAreaCode === undefined &&
    hasCoordinates
  );
}
