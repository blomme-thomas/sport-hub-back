-- CreateTable
CREATE TABLE "foods" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "categories" TEXT[],
    "calories" DECIMAL(8,2),
    "proteins" DECIMAL(8,2),
    "carbohydrates" DECIMAL(8,2),
    "fats" DECIMAL(8,2),
    "sugars" DECIMAL(8,2),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "foods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "foods_name_idx" ON "foods"("name");
