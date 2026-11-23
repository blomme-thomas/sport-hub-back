-- CreateTable
CREATE TABLE "recipes" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "meal_tags" TEXT[],
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_items" (
    "id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "food_id" UUID NOT NULL,
    "component" VARCHAR(20),
    "quantity" DECIMAL(10,2),
    "position" INTEGER NOT NULL,

    CONSTRAINT "recipe_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recipe_items_recipe_id_idx" ON "recipe_items"("recipe_id");

-- AddForeignKey
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
