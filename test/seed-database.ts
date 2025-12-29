import { Role } from "@prisma/client";
import { hash } from "bcrypt";

import { testPrisma } from "./clean-database";

export async function seedDatabase() {
  const adminPassword = await hash("AdminPassword123!", 10);
  const userPassword = await hash("UserPassword123!", 10);

  await testPrisma.user.createMany({
    data: [
      {
        id: 1,
        email: "adam.nowak@imejl.pl",
        username: "nowakowski",
        password: userPassword,
        role: Role.USER,
      },
      {
        id: 2,
        email: "admin@example.com",
        username: "admin",
        password: adminPassword,
        role: Role.ADMIN,
      },
    ],
  });

  await testPrisma.offer.createMany({
    data: [
      {
        id: 1,
        link: "https://olx.pl/offer/1",
        title: "iPhone 15 Pro",
        price: 4500,
        description: "Nowy telefon w oryginalnym opakowaniu",
        source: "olx",
        createdAt: new Date(),
        images: ["https://example.com/image1.jpg"],
        userId: 1,
      },
      {
        id: 2,
        link: "https://allegro.pl/offer/2",
        title: "MacBook Pro M3",
        price: 12_000,
        description: "Laptop w idealnym stanie",
        source: "allegro",
        createdAt: new Date(),
        images: [],
        userId: 2,
      },
    ],
  });

  await testPrisma.$executeRaw`SELECT setval(pg_get_serial_sequence('users', 'id'), MAX(id)) FROM users;`;
  await testPrisma.$executeRaw`SELECT setval(pg_get_serial_sequence('offers', 'id'), MAX(id)) FROM offers;`;
}
