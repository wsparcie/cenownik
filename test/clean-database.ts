import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function cleanDatabase() {
  await prisma.offer.deleteMany();
  await prisma.user.deleteMany();
}

export { prisma as testPrisma };
