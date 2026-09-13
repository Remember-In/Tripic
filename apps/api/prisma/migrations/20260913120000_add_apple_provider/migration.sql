-- AlterEnum
ALTER TYPE "AuthProvider" ADD VALUE 'APPLE';

-- CreateTable
CREATE TABLE "apple_credentials" (
    "socialAccountId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apple_credentials_pkey" PRIMARY KEY ("socialAccountId")
);

-- AddForeignKey
ALTER TABLE "apple_credentials" ADD CONSTRAINT "apple_credentials_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "social_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
