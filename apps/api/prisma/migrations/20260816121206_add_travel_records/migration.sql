-- CreateEnum
CREATE TYPE "RecordTheme" AS ENUM ('NATURE_SCENERY', 'HISTORY_CULTURE', 'FOOD_EXPERIENCE', 'REGION_COMPLETE');

-- CreateEnum
CREATE TYPE "DiaryStyle" AS ENUM ('DOCU_NARRATION', 'EMOTIONAL_ESSAY', 'FRIEND_CHAT');

-- CreateEnum
CREATE TYPE "EntrySource" AS ENUM ('USER', 'AI');

-- CreateTable
CREATE TABLE "records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "theme" "RecordTheme",
    "style" "DiaryStyle",
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_entries" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "content" TEXT NOT NULL,
    "source" "EntrySource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "record_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_places" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "ktoContentId" TEXT NOT NULL,
    "areaCode" TEXT NOT NULL,
    "sigunguCode" TEXT,
    "categoryCode" TEXT,
    "visitedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "record_places_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "records_userId_createdAt_idx" ON "records"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "record_entries_recordId_date_key" ON "record_entries"("recordId", "date");

-- CreateIndex
CREATE INDEX "record_places_recordId_idx" ON "record_places"("recordId");

-- CreateIndex
CREATE INDEX "record_places_areaCode_sigunguCode_idx" ON "record_places"("areaCode", "sigunguCode");

-- AddForeignKey
ALTER TABLE "records" ADD CONSTRAINT "records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_entries" ADD CONSTRAINT "record_entries_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_places" ADD CONSTRAINT "record_places_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
