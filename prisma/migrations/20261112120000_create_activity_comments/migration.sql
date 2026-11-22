-- CreateTable
CREATE TABLE "activity_comments" (
    "activity_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "model" TEXT,
    "generated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "activity_comments_pkey" PRIMARY KEY ("activity_id"),
    CONSTRAINT "activity_comments_source_check" CHECK ("source" IN ('ia', 'generique'))
);
