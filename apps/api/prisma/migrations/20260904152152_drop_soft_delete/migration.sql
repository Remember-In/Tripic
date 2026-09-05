/*
  Warnings:

  - You are about to drop the column `deletedAt` on the `records` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "records" DROP COLUMN "deletedAt";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "deletedAt",
DROP COLUMN "status";

-- DropEnum
DROP TYPE "UserStatus";
