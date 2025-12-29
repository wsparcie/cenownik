import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcrypt";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");
  console.log("DATABASE_URL:", process.env.DATABASE_URL ? "SET" : "NOT SET");

  console.log("Deleting existing data...");
  await prisma.offer.deleteMany();
  await prisma.user.deleteMany();

  const password = await hash("haslo123", 10);

  const adminUser = await prisma.user.create({
    data: {
      email: "admin@cenownik.pl",
      username: "administrator",
      password: password,
      role: Role.ADMIN,
    },
  });

  const regularUser1 = await prisma.user.create({
    data: {
      email: "jan.kowalski@example.pl",
      username: "jan_kowalski",
      password: password,
      role: Role.USER,
    },
  });

  const regularUser2 = await prisma.user.create({
    data: {
      email: "anna.nowak@example.pl",
      username: "anna_nowak",
      password: password,
      role: Role.USER,
    },
  });

  await prisma.offer.create({
    data: {
      link: "https://mediamarkt.pl/komputery-i-tablety/laptop-apple-macbook-air",
      title: "Laptop APPLE MacBook Air",
      price: 4990,
      description: "Laptop Apple MacBook Air idealny do pracy i rozrywki.",
      source: "mediamarkt",
      createdAt: new Date(),
      images: [
        "https://mediamarkt.pl/images/macbook-air-1.jpg",
        "https://mediamarkt.pl/images/macbook-air-2.jpg",
      ],
      userId: regularUser1.id,
    },
  });

  await prisma.offer.create({
    data: {
      link: "https://mediaexpert.pl/telewizory/telewizor-samsung",
      title: "Telewizor SAMSUNG QLED 4K",
      price: 3299,
      description:
        "Telewizor Samsung QLED 4K z doskonałą jakością obrazu i dźwięku.",
      source: "mediaexpert",
      createdAt: new Date(),
      images: ["https://mediaexpert.pl/images/samsung-tv-1.jpg"],
      userId: regularUser2.id,
    },
  });

  await prisma.offer.create({
    data: {
      link: "https://mediamarkt.pl/smartfony/smartfon-samsung-galaxy-s24",
      title: "Smartfon SAMSUNG Galaxy S24",
      price: 5499,
      description: "Flagowy smartfon Samsung Galaxy S24 Ultra",
      source: "mediamarkt",
      createdAt: new Date(),
      images: [],
    },
  });

  await prisma.offer.create({
    data: {
      link: "https://mediaexpert.pl/agd/pralka-bosch-serie-6",
      title: "Pralka BOSCH Serie 6",
      price: 2799,
      description: "Pralka Bosch Serie 6, klasa energetyczna A.",
      source: "mediaexpert",
      createdAt: new Date(),
      images: [
        "https://mediaexpert.pl/images/bosch-pralka-1.jpg",
        "https://mediaexpert.pl/images/bosch-pralka-2.jpg",
      ],
      userId: regularUser1.id,
    },
  });

  await prisma.offer.create({
    data: {
      link: "https://mediamarkt.pl/konsole/konsola-sony-playstation-5",
      title: "Konsola SONY PlayStation 5 z napędem",
      price: 2399,
      description: "Najnowsza konsola Sony PlayStation 5 z napędem",
      source: "mediamarkt",
      createdAt: new Date(),
      images: ["https://mediamarkt.pl/images/ps5-slim-1.jpg"],
      userId: regularUser2.id,
    },
  });

  console.log("Seeding completed successfully!");
  console.log("Created 3 users and 5 offers.");
}

main()
  .then(() => {
    console.log("Seed script finished.");
  })
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
