-- CreateTable
CREATE TABLE "record_photos" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "data" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "record_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "record_photos_recordId_date_idx" ON "record_photos"("recordId", "date");

-- AddForeignKey
ALTER TABLE "record_photos" ADD CONSTRAINT "record_photos_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
