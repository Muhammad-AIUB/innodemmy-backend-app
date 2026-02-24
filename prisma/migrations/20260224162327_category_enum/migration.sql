/*
  Warnings:

  - The `category` column on the `Webinar` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "CourseCategory" AS ENUM ('PROGRAMMING');

-- AlterTable
ALTER TABLE "Webinar" DROP COLUMN "category",
ADD COLUMN     "category" "CourseCategory";

-- CreateIndex
CREATE INDEX "Webinar_category_idx" ON "Webinar"("category");
