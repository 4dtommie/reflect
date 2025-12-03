-- CreateTable
CREATE TABLE "variable_spending_patterns" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "category_name" TEXT NOT NULL,
    "monthly_average" DECIMAL(10,2) NOT NULL,
    "visits_per_month" DECIMAL(5,2) NOT NULL,
    "average_per_visit" DECIMAL(10,2) NOT NULL,
    "total_spent" DECIMAL(12,2) NOT NULL,
    "total_transactions" INTEGER NOT NULL,
    "unique_merchants" INTEGER NOT NULL,
    "top_merchants" JSONB,
    "min_amount" DECIMAL(10,2) NOT NULL,
    "max_amount" DECIMAL(10,2) NOT NULL,
    "first_transaction" TIMESTAMP(3) NOT NULL,
    "last_transaction" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "variable_spending_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "variable_spending_patterns_user_id_idx" ON "variable_spending_patterns"("user_id");

-- CreateIndex
CREATE INDEX "variable_spending_patterns_status_idx" ON "variable_spending_patterns"("status");

-- CreateIndex
CREATE UNIQUE INDEX "variable_spending_patterns_user_id_category_id_key" ON "variable_spending_patterns"("user_id", "category_id");

-- AddForeignKey
ALTER TABLE "variable_spending_patterns" ADD CONSTRAINT "variable_spending_patterns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variable_spending_patterns" ADD CONSTRAINT "variable_spending_patterns_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
