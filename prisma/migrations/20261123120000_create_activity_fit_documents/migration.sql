-- CreateTable
CREATE TABLE "activity_fit_documents" (
    "activity_id" UUID NOT NULL,
    "format_version" INTEGER NOT NULL,
    "document" JSONB NOT NULL,

    CONSTRAINT "activity_fit_documents_pkey" PRIMARY KEY ("activity_id")
);

-- AddForeignKey
ALTER TABLE "activity_fit_documents" ADD CONSTRAINT "activity_fit_documents_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
