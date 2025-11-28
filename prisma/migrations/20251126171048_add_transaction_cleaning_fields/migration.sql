-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "amount_category" TEXT,
ADD COLUMN     "cleaned_merchant_name" TEXT,
ADD COLUMN     "fuzzy_match_merchant" TEXT,
ADD COLUMN     "fuzzy_matched_at" TIMESTAMP(3),
ADD COLUMN     "normalized_description" TEXT;

-- CreateIndex
CREATE INDEX "transactions_user_id_fuzzy_matched_at_idx" ON "transactions"("user_id", "fuzzy_matched_at");
