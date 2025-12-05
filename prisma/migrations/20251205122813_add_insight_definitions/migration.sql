-- CreateTable
CREATE TABLE "insight_definitions" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "trigger" TEXT NOT NULL,
    "trigger_params" JSONB,
    "message_template" TEXT NOT NULL,
    "icon" TEXT,
    "action_label" TEXT,
    "action_href" TEXT,
    "contexts" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insight_definitions_pkey" PRIMARY KEY ("id")
);
