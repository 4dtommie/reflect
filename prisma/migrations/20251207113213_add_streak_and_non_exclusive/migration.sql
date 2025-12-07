-- AlterTable
ALTER TABLE "insight_definitions" ADD COLUMN     "non_exclusive" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "login_streak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "streak_updated_at" TIMESTAMP(3);
