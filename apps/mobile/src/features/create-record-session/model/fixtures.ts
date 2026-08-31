import type { DraftVisit } from "./types";

export function createFixtureVisits(): DraftVisit[] {
  return [
    {
      date: "2026.07.22",
      id: "fixture-visit-1",
      name: "대구광역시, 수성구 수성못",
    },
    {
      date: "2026.07.23",
      id: "fixture-visit-2",
      name: "대구광역시, 북구 경북대학교",
    },
  ];
}

export const placeFixtures = [
  { address: "경상북도 경주시", name: "경주월드" },
  { address: "대구광역시 수성구", name: "수성못" },
  { address: "대구광역시 북구", name: "경북대학교" },
] as const;
