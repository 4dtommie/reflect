-- AlterTable
ALTER TABLE "insight_definitions" ADD COLUMN     "related_insight_id" TEXT;

-- AddForeignKey
ALTER TABLE "insight_definitions" ADD CONSTRAINT "insight_definitions_related_insight_id_fkey" FOREIGN KEY ("related_insight_id") REFERENCES "insight_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
