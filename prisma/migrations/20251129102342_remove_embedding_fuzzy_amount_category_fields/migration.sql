/*
  Warnings:

  - You are about to drop the column `embedding` on the `categories` table. All the data in the column will be lost.
  - You are about to drop the column `embedding_updated_at` on the `categories` table. All the data in the column will be lost.
  - You are about to drop the column `amount_category` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `fuzzy_match_merchant` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `fuzzy_matched_at` on the `transactions` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "categories_embedding_idx";

-- DropIndex
DROP INDEX "transactions_user_id_fuzzy_matched_at_idx";

-- AlterTable
ALTER TABLE "categories" DROP COLUMN "embedding",
DROP COLUMN "embedding_updated_at";

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "amount_category",
DROP COLUMN "fuzzy_match_merchant",
DROP COLUMN "fuzzy_matched_at";
