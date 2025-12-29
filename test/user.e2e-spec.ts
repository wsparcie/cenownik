import { Role } from "@prisma/client";
import request from "supertest";
import type { App } from "supertest/types";

import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { AppModule } from "../src/app.module";
import { cleanDatabase } from "./clean-database";
import { seedDatabase } from "./seed-database";

interface UserResponse {
  id: number;
  email: string;
  username: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
  password?: string;
}

describe("UserController (e2e)", () => {
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
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        forbidUnknownValues: true,
        transform: true,
      }),
    );
    await app.init();

    const userLogin = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "adam.nowak@imejl.pl", password: "UserPassword123!" });
    userAuthToken = `Bearer ${(userLogin.body as { token: string }).token}`;

    const adminLogin = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "admin@example.com", password: "AdminPassword123!" });
    adminAuthToken = `Bearer ${(adminLogin.body as { token: string }).token}`;
  }, 10_000);

  afterEach(async () => {
    await app.close();
  });

  describe("/users (GET)", () => {
    it("should return all users", async () => {
      const response = await request(app.getHttpServer())
        .get("/users")
        .set("Authorization", adminAuthToken)
        .expect(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect((response.body as UserResponse[]).length).toBeGreaterThan(0);
      for (const user of response.body as UserResponse[]) {
        expect(user).toHaveProperty("id");
        expect(user).toHaveProperty("email");
        expect(user).toHaveProperty("username");
        expect(user).toHaveProperty("role");
        expect(user).not.toHaveProperty("password");
      }
    });

    it("should require authentication", async () => {
      await request(app.getHttpServer()).get("/users").expect(401);
    });

    it("should require ADMIN role", async () => {
      await request(app.getHttpServer())
        .get("/users")
        .set("Authorization", userAuthToken)
        .expect(403);
    });
  });

  describe("/users/:email (GET)", () => {
    it("should return a user by email", async () => {
      const response = await request(app.getHttpServer())
        .get("/users/adam.nowak@imejl.pl")
        .set("Authorization", userAuthToken)
        .expect(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          email: "adam.nowak@imejl.pl",
          username: expect.any(String) as string,
          role: Role.USER,
        }),
      );
      expect(response.body).toHaveProperty("password");
    });

    it("should return 404 for non-existent user", async () => {
      await request(app.getHttpServer())
        .get("/users/nieistnieje@imejl.pl")
        .set("Authorization", userAuthToken)
        .expect(404);
    });

    it("should require authentication", async () => {
      await request(app.getHttpServer())
        .get("/users/adam.nowak@imejl.pl")
        .expect(401);
    });
  });

  describe("/users/:email (PATCH)", () => {
    it("should allow user to update their own profile", async () => {
      const updateData = {
        username: "zaktualizowany_adam",
      };
      const response = await request(app.getHttpServer())
        .patch("/users/adam.nowak@imejl.pl")
        .set("Authorization", userAuthToken)
        .send(updateData)
        .expect(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          email: "adam.nowak@imejl.pl",
          username: "zaktualizowany_adam",
        }),
      );
      expect(response.body).not.toHaveProperty("password");
    });

    it("should allow admin to update any user", async () => {
      const updateData = {
        username: "zaktualizował_admin",
      };
      const response = await request(app.getHttpServer())
        .patch("/users/adam.nowak@imejl.pl")
        .set("Authorization", adminAuthToken)
        .send(updateData)
        .expect(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          email: "adam.nowak@imejl.pl",
          username: "zaktualizował_admin",
        }),
      );
    });

    it("should validate email format if provided", async () => {
      const updateData = {
        email: "invalid-email",
      };
      await request(app.getHttpServer())
        .patch("/users/adam.nowak@imejl.pl")
        .set("Authorization", userAuthToken)
        .send(updateData)
        .expect(400);
    });

    it("should validate username length", async () => {
      const updateData = {
        username: "x".repeat(256),
      };
      await request(app.getHttpServer())
        .patch("/users/adam.nowak@imejl.pl")
        .set("Authorization", userAuthToken)
        .send(updateData)
        .expect(400);
    });

    it("should return 404 for non-existent user", async () => {
      const updateData = {
        username: "zaktualizowany",
      };
      await request(app.getHttpServer())
        .patch("/users/nieistnieje@imejl.pl")
        .set("Authorization", adminAuthToken)
        .send(updateData)
        .expect(404);
    });

    it("should require authentication", async () => {
      const updateData = {
        username: "nieautoryzowana_aktualizacja",
      };
      await request(app.getHttpServer())
        .patch("/users/adam.nowak@imejl.pl")
        .send(updateData)
        .expect(401);
    });

    it("should handle password update", async () => {
      const updateData = {
        password: "NoweHasło123!",
      };
      const response = await request(app.getHttpServer())
        .patch("/users/adam.nowak@imejl.pl")
        .set("Authorization", userAuthToken)
        .send(updateData)
        .expect(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          email: "adam.nowak@imejl.pl",
        }),
      );
      expect(response.body).not.toHaveProperty("password");
    });
  });

  describe("/users/:email (DELETE)", () => {
    it("should delete a user", async () => {
      await request(app.getHttpServer())
        .delete("/users/adam.nowak@imejl.pl")
        .set("Authorization", adminAuthToken)
        .expect(200);
      await request(app.getHttpServer())
        .get("/users/adam.nowak@imejl.pl")
        .set("Authorization", adminAuthToken)
        .expect(404);
    });

    it("should require authentication", async () => {
      await request(app.getHttpServer())
        .delete("/users/adam.nowak@imejl.pl")
        .expect(401);
    });

    it("should require ADMIN role", async () => {
      await request(app.getHttpServer())
        .delete("/users/adam.nowak@imejl.pl")
        .set("Authorization", userAuthToken)
        .expect(403);
    });

    it("should return 404 for non-existent user", async () => {
      await request(app.getHttpServer())
        .delete("/users/nieistnieje@imejl.pl")
        .set("Authorization", adminAuthToken)
        .expect(404);
    });
  });
});
