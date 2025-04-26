/*
  Warnings:

  - A unique constraint covering the columns `[name,albumId,artistId]` on the table `Track` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Track_name_albumId_artistId_key" ON "Track"("name", "albumId", "artistId");
