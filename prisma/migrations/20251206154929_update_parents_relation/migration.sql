/*
  Warnings:

  - You are about to drop the column `related_insight_id` on the `insight_definitions` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "insight_definitions" DROP CONSTRAINT "insight_definitions_related_insight_id_fkey";

-- DropIndex
DROP INDEX "insight_definitions_related_insight_id_idx";

-- AlterTable
ALTER TABLE "insight_definitions" DROP COLUMN "related_insight_id";

-- CreateTable
CREATE TABLE "_InsightHierarchy" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_InsightHierarchy_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_InsightHierarchy_B_index" ON "_InsightHierarchy"("B");

-- AddForeignKey
ALTER TABLE "_InsightHierarchy" ADD CONSTRAINT "_InsightHierarchy_A_fkey" FOREIGN KEY ("A") REFERENCES "insight_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InsightHierarchy" ADD CONSTRAINT "_InsightHierarchy_B_fkey" FOREIGN KEY ("B") REFERENCES "insight_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
