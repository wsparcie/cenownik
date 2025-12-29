import request from "supertest";
import type { App } from "supertest/types";

import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { TestingModule } from "@nestjs/testing";

import { AppModule } from "../src/app.module";
import { cleanDatabase } from "./clean-database";
import { seedDatabase } from "./seed-database";

describe("OfferController (e2e)", () => {
  let app: INestApplication<App>;
  let userAuthToken: string;
  let adminAuthToken: string;

  beforeEach(async () => {
    await cleanDatabase();
    await seedDatabase();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    const userLogin = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "adam.nowak@imejl.pl", password: "UserPassword123!" });
    userAuthToken = `Bearer ${(userLogin.body as { token: string }).token}`;

    const adminLogin = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "admin@example.com", password: "AdminPassword123!" });
    adminAuthToken = `Bearer ${(adminLogin.body as { token: string }).token}`;
  });

  afterEach(async () => {
    await app.close();
  });

  describe("/offers (GET)", () => {
    it("should return all offers", async () => {
      const response = await request(app.getHttpServer())
        .get("/offers")
        .expect(200);
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            title: "iPhone 15 Pro",
            source: "olx",
          }),
          expect.objectContaining({
            id: 2,
            title: "MacBook Pro M3",
            source: "allegro",
          }),
        ]),
      );
    });
  });

  describe("/offers/statistics (GET)", () => {
    it("should return offer statistics", async () => {
      const response = await request(app.getHttpServer())
        .get("/offers/statistics")
        .expect(200);
      expect(response.body).toHaveProperty("total");
      expect(response.body).toHaveProperty("bySource");
      expect((response.body as { total: number }).total).toBe(2);
    });
  });

  describe("/offers/:id (GET)", () => {
    it("should return an offer by id", async () => {
      const response = await request(app.getHttpServer())
        .get("/offers/1")
        .expect(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          id: 1,
          title: "iPhone 15 Pro",
          source: "olx",
        }),
      );
    });

    it("should return 404 for non-existent offer", async () => {
      await request(app.getHttpServer()).get("/offers/999").expect(404);
    });
  });

  describe("/offers (POST)", () => {
    it("should create a new offer", async () => {
      const newOffer = {
        link: "https://olx.pl/offer/new-item",
        title: "Samsung Galaxy S24",
        price: 3500,
        description: "Nowy telefon Samsung",
        source: "olx",
      };
      const response = await request(app.getHttpServer())
        .post("/offers")
        .set("Authorization", userAuthToken)
        .send(newOffer)
        .expect(201);
      expect(response.body).toEqual(
        expect.objectContaining({
          id: expect.any(Number) as number,
          title: "Samsung Galaxy S24",
          source: "olx",
          price: "3500",
        }),
      );
    });

    it("should return 409 for duplicate link", async () => {
      const duplicateOffer = {
        link: "https://olx.pl/offer/1",
        title: "Duplicate Offer",
        price: 1000,
        source: "olx",
      };
      await request(app.getHttpServer())
        .post("/offers")
        .set("Authorization", userAuthToken)
        .send(duplicateOffer)
        .expect(409);
    });

    it("should require authentication", async () => {
      const newOffer = {
        link: "https://olx.pl/offer/unauthorized",
        title: "Unauthorized Offer",
        price: 1000,
        source: "olx",
      };
      await request(app.getHttpServer())
        .post("/offers")
        .send(newOffer)
        .expect(401);
    });

    it("should validate required fields", async () => {
      const invalidOffer = {
        title: "Missing fields",
      };
      await request(app.getHttpServer())
        .post("/offers")
        .set("Authorization", userAuthToken)
        .send(invalidOffer)
        .expect(400);
    });
  });

  describe("/offers/:id (PATCH)", () => {
    it("should update an offer (admin only)", async () => {
      const updateData = {
        title: "Updated iPhone 15 Pro",
        price: 4200,
      };
      const response = await request(app.getHttpServer())
        .patch("/offers/1")
        .set("Authorization", adminAuthToken)
        .send(updateData)
        .expect(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          id: 1,
          title: "Updated iPhone 15 Pro",
          price: "4200",
        }),
      );
    });

    it("should require ADMIN role", async () => {
      const updateData = {
        title: "User trying to update",
      };
      await request(app.getHttpServer())
        .patch("/offers/1")
        .set("Authorization", userAuthToken)
        .send(updateData)
        .expect(403);
    });

    it("should require authentication", async () => {
      const updateData = {
        title: "Unauthorized update",
      };
      await request(app.getHttpServer())
        .patch("/offers/1")
        .send(updateData)
        .expect(401);
    });

    it("should return 404 for non-existent offer", async () => {
      const updateData = {
        title: "Non-existent",
      };
      await request(app.getHttpServer())
        .patch("/offers/999")
        .set("Authorization", adminAuthToken)
        .send(updateData)
        .expect(404);
    });
  });

  describe("/offers/:id (DELETE)", () => {
    it("should delete an offer (admin only)", async () => {
      const response = await request(app.getHttpServer())
        .delete("/offers/1")
        .set("Authorization", adminAuthToken)
        .expect(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          id: 1,
          title: "iPhone 15 Pro",
        }),
      );

      await request(app.getHttpServer()).get("/offers/1").expect(404);
    });

    it("should require ADMIN role", async () => {
      await request(app.getHttpServer())
        .delete("/offers/1")
        .set("Authorization", userAuthToken)
        .expect(403);
    });

    it("should require authentication", async () => {
      await request(app.getHttpServer()).delete("/offers/1").expect(401);
    });

    it("should return 404 for non-existent offer", async () => {
      await request(app.getHttpServer())
        .delete("/offers/999")
        .set("Authorization", adminAuthToken)
        .expect(404);
    });
  });
});
