import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Structure du script de seed - Vous pouvez insérer vos données ici
  // Exemple:
  // await prisma.user.create({ ... })
  // await prisma.category.create({ ... })
  // await prisma.recipe.create({ ... })

  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
