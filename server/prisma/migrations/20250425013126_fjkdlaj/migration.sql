/*
  Warnings:

  - Added the required column `duration_ms` to the `Track` table without a default value. This is not possible if the table is not empty.
  - Added the required column `track_number` to the `Track` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Track" ADD COLUMN     "duration_ms" INTEGER NOT NULL,
ADD COLUMN     "track_number" INTEGER NOT NULL;
