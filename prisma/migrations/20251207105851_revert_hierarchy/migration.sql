/*
  Warnings:

  - You are about to drop the `_InsightHierarchy` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_InsightHierarchy" DROP CONSTRAINT "_InsightHierarchy_A_fkey";

-- DropForeignKey
ALTER TABLE "_InsightHierarchy" DROP CONSTRAINT "_InsightHierarchy_B_fkey";

-- AlterTable
ALTER TABLE "insight_definitions" ADD COLUMN     "related_insight_id" TEXT;

-- DropTable
DROP TABLE "_InsightHierarchy";

-- AddForeignKey
ALTER TABLE "insight_definitions" ADD CONSTRAINT "insight_definitions_related_insight_id_fkey" FOREIGN KEY ("related_insight_id") REFERENCES "insight_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
