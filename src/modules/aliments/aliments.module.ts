import { Module } from '@nestjs/common';
import { CreateFoodUseCase } from './application/use-cases/create-food.use-case.js';
import { GetFoodUseCase } from './application/use-cases/get-food.use-case.js';
import { ListFoodsUseCase } from './application/use-cases/list-foods.use-case.js';
import { UpdateFoodUseCase } from './application/use-cases/update-food.use-case.js';
import { FOOD_REPOSITORY } from './domain/ports/outbound/food.repository.port.js';
import { FOOD_LIST_READ_MODEL } from './domain/ports/outbound/food-list.read-model.port.js';
import { PrismaFoodRepositoryAdapter } from './infrastructure/persistence/prisma/food.repository.adapter.js';
import { PrismaFoodListReadModel } from './infrastructure/persistence/prisma/food-list.read-model.js';
import { FoodsController } from './presentation/http/controllers/foods.controller.js';

@Module({
  controllers: [FoodsController],
  providers: [
    CreateFoodUseCase,
    UpdateFoodUseCase,
    GetFoodUseCase,
    ListFoodsUseCase,
    { provide: FOOD_REPOSITORY, useClass: PrismaFoodRepositoryAdapter },
    { provide: FOOD_LIST_READ_MODEL, useClass: PrismaFoodListReadModel },
  ],
})
export class AlimentsModule {}
