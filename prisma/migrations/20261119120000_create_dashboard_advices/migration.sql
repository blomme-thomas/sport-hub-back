-- CreateTable
CREATE TABLE "dashboard_advices" (
    "week" VARCHAR(8) NOT NULL,
    "text" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "model" TEXT,
    "generated_at" TIMESTAMPTZ(3) NOT NULL,
    "source_summary" JSONB NOT NULL,

    CONSTRAINT "dashboard_advices_pkey" PRIMARY KEY ("week"),
    CONSTRAINT "dashboard_advices_source_check" CHECK ("source" IN ('ia', 'insuffisant'))
);
