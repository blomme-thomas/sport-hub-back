-- CreateTable
CREATE TABLE "session_imports" (
    "id" UUID NOT NULL,
    "imported_at" TIMESTAMPTZ(3) NOT NULL,
    "session_count" INTEGER NOT NULL,

    CONSTRAINT "session_imports_pkey" PRIMARY KEY ("id")
);

