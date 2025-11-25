/*
  Warnings:

  - You are about to drop the column `keywords` on the `categories` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "categories" DROP COLUMN "keywords";

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "category_confidence" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "category_keywords" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "keyword" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "source_transaction_id" INTEGER,
    "confidence" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "category_keywords_category_id_idx" ON "category_keywords"("category_id");

-- CreateIndex
CREATE INDEX "category_keywords_keyword_idx" ON "category_keywords"("keyword");

-- CreateIndex
CREATE UNIQUE INDEX "category_keywords_category_id_keyword_key" ON "category_keywords"("category_id", "keyword");

-- AddForeignKey
ALTER TABLE "category_keywords" ADD CONSTRAINT "category_keywords_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_keywords" ADD CONSTRAINT "category_keywords_source_transaction_id_fkey" FOREIGN KEY ("source_transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
