import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../../core/prisma/generated/client.js';
import { seedFoods } from './seed-foods.js';

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined || connectionString === '') {
    throw new Error(
      'DATABASE_URL est requis pour exécuter le seed des aliments.',
    );
  }
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  try {
    const result = await seedFoods(prisma);
    console.log(
      `Seed aliments : ${result.created} créés, ${result.updated} mis à jour.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
