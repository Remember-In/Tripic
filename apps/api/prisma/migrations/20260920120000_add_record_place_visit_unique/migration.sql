-- 방문일을 날짜 단위로 좁힌다 (docs/16 §2.1).
-- timestamp 로 두면 같은 날 같은 관광지가 시각 차이로 다른 행이 되어 아래 unique 가 무력해지고,
-- 타임존 때문에 지도 집계가 하루씩 어긋난다.
-- AlterTable
ALTER TABLE "record_places" ALTER COLUMN "visitedAt" SET DATA TYPE DATE;

-- 같은 기록에 같은 관광지를 같은 날 두 번 담지 않는다 (docs/16 §3.1).
-- 중복 요청은 409 로 응답하며, 동시 요청 경합은 이 제약이 최종적으로 막는다.
-- CreateIndex
CREATE UNIQUE INDEX "record_places_recordId_ktoContentId_visitedAt_key" ON "record_places"("recordId", "ktoContentId", "visitedAt");
