-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN     "data" JSONB;

-- AlterTable
ALTER TABLE "insight_definitions" ADD COLUMN     "description" TEXT,
ADD COLUMN     "name" TEXT;

-- AlterTable
ALTER TABLE "merchants" ALTER COLUMN "is_potential_recurring" DROP NOT NULL,
ALTER COLUMN "is_potential_recurring" DROP DEFAULT;

-- AlterTable
ALTER TABLE "recurring_transactions" ADD COLUMN     "is_debit" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "last_categorization_attempt_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "iban" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "is_own_account" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bank_accounts_user_id_idx" ON "bank_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_user_id_iban_key" ON "bank_accounts"("user_id", "iban");

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
