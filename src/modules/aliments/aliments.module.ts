import { Module } from '@nestjs/common';
import { CreateFoodUseCase } from './application/use-cases/create-food.use-case.js';
import { GetFoodUseCase } from './application/use-cases/get-food.use-case.js';
import { ListFoodsUseCase } from './application/use-cases/list-foods.use-case.js';
import { UpdateFoodUseCase } from './application/use-cases/update-food.use-case.js';
import { FOOD_REPOSITORY } from './domain/ports/outbound/food.repository.port.js';
import { CreateRecipeUseCase } from './application/use-cases/create-recipe.use-case.js';
import { DeleteRecipeUseCase } from './application/use-cases/delete-recipe.use-case.js';
import { GetRecipeUseCase } from './application/use-cases/get-recipe.use-case.js';
import { ListRecipesUseCase } from './application/use-cases/list-recipes.use-case.js';
import { UpdateRecipeUseCase } from './application/use-cases/update-recipe.use-case.js';
import { RECIPE_REPOSITORY } from './domain/ports/outbound/recipe.repository.port.js';
import { PrismaRecipeRepositoryAdapter } from './infrastructure/persistence/prisma/recipe.repository.adapter.js';
import { RecipesController } from './presentation/http/controllers/recipes.controller.js';
import { AddPlannedMealUseCase } from './application/use-cases/add-planned-meal.use-case.js';
import { ListPlannedMealsUseCase } from './application/use-cases/list-planned-meals.use-case.js';
import { MovePlannedMealUseCase } from './application/use-cases/move-planned-meal.use-case.js';
import { RemovePlannedMealUseCase } from './application/use-cases/remove-planned-meal.use-case.js';
import { PLANNED_MEAL_REPOSITORY } from './domain/ports/outbound/planned-meal.repository.port.js';
import { PrismaPlannedMealRepositoryAdapter } from './infrastructure/persistence/prisma/planned-meal.repository.adapter.js';
import { MealPlanController } from './presentation/http/controllers/meal-plan.controller.js';
import { FOOD_LIST_READ_MODEL } from './domain/ports/outbound/food-list.read-model.port.js';
import { PrismaFoodRepositoryAdapter } from './infrastructure/persistence/prisma/food.repository.adapter.js';
import { PrismaFoodListReadModel } from './infrastructure/persistence/prisma/food-list.read-model.js';
import { FoodsController } from './presentation/http/controllers/foods.controller.js';

@Module({
  controllers: [FoodsController, RecipesController, MealPlanController],
  providers: [
    CreateFoodUseCase,
    UpdateFoodUseCase,
    GetFoodUseCase,
    ListFoodsUseCase,
    CreateRecipeUseCase,
    UpdateRecipeUseCase,
    GetRecipeUseCase,
    ListRecipesUseCase,
    DeleteRecipeUseCase,
    ListPlannedMealsUseCase,
    AddPlannedMealUseCase,
    MovePlannedMealUseCase,
    RemovePlannedMealUseCase,
    { provide: FOOD_REPOSITORY, useClass: PrismaFoodRepositoryAdapter },
    { provide: FOOD_LIST_READ_MODEL, useClass: PrismaFoodListReadModel },
    { provide: RECIPE_REPOSITORY, useClass: PrismaRecipeRepositoryAdapter },
    {
      provide: PLANNED_MEAL_REPOSITORY,
      useClass: PrismaPlannedMealRepositoryAdapter,
    },
  ],
})
export class AlimentsModule {}
