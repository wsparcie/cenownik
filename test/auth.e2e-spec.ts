import request from "supertest";
import type { App } from "supertest/types";

import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { AppModule } from "../src/app.module";
import { cleanDatabase } from "./clean-database";
import { seedDatabase } from "./seed-database";

interface TokenResponse {
  token: string;
}

interface UserResponse {
  id: number;
  email: string;
  username: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
}

interface ErrorResponse {
  message: string | string[];
  error?: string;
  statusCode: number;
}

describe("AuthController (e2e)", () => {
  let app: INestApplication<App>;

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
  }, 10_000);

  afterEach(async () => {
    await app.close();
  });

  describe("/auth/login (POST)", () => {
    it("should login with valid credentials", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: "admin@example.com", password: "AdminPassword123!" })
        .expect(200);

      const body = response.body as TokenResponse;
      expect(body).toHaveProperty("token");
      expect(typeof body.token).toBe("string");
      expect(body.token.length).toBeGreaterThan(0);
    });

    it("should return 401 for wrong password", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: "admin@example.com", password: "WrongPassword123!" })
        .expect(401);

      const body = response.body as ErrorResponse;
      expect(body.statusCode).toBe(401);
    });

    it("should return 404 for non-existent user", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: "nonexistent@example.com", password: "Password123!" })
        .expect(404);

      const body = response.body as ErrorResponse;
      expect(body.statusCode).toBe(404);
    });

    it("should validate email format", async () => {
      await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: "invalid-email", password: "Password123!" })
        .expect(400);
    });

    it("should require email field", async () => {
      await request(app.getHttpServer())
        .post("/auth/login")
        .send({ password: "Password123!" })
        .expect(400);
    });

    it("should require password field", async () => {
      await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: "test@example.com" })
        .expect(400);
    });

    it("should return 401 for weak password (auth failure, not validation)", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: "admin@example.com", password: "weak" })
        .expect(401);

      const body = response.body as ErrorResponse;
      expect(body.statusCode).toBe(401);
    });
  });

  describe("/auth/register (POST)", () => {
    it("should register a new user", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/register")
        .send({
          email: "newuser@example.com",
          password: "NewPassword123!",
          username: "newuser",
        })
        .expect(201);

      const body = response.body as TokenResponse;
      expect(body).toHaveProperty("token");
      expect(typeof body.token).toBe("string");
    });

    it("should register without username", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/register")
        .send({
          email: "nousername@example.com",
          password: "NewPassword123!",
        })
        .expect(201);

      const body = response.body as TokenResponse;
      expect(body).toHaveProperty("token");
    });

    it("should return 409 for duplicate email", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/register")
        .send({
          email: "admin@example.com",
          password: "NewPassword123!",
        })
        .expect(409);

      const body = response.body as ErrorResponse;
      expect(body.statusCode).toBe(409);
    });

    it("should validate email format", async () => {
      await request(app.getHttpServer())
        .post("/auth/register")
        .send({
          email: "invalid-email",
          password: "NewPassword123!",
        })
        .expect(400);
    });

    it("should allow registration with weak password (OAuth flow support)", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/register")
        .send({
          email: "valid@example.com",
          password: "weak",
        })
        .expect(201);

      const body = response.body as TokenResponse;
      expect(body).toHaveProperty("token");
    });

    it("should require email field", async () => {
      await request(app.getHttpServer())
        .post("/auth/register")
        .send({
          password: "NewPassword123!",
        })
        .expect(400);
    });

    it("should validate username length", async () => {
      const longUsername = "a".repeat(256);
      await request(app.getHttpServer())
        .post("/auth/register")
        .send({
          email: "valid@example.com",
          password: "NewPassword123!",
          username: longUsername,
        })
        .expect(400);
    });

    it("should allow registration with valid long email", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/register")
        .send({
          email: "verylongemail@verylongdomain.example.com",
          password: "NewPassword123!",
        })
        .expect(201);

      const body = response.body as TokenResponse;
      expect(body).toHaveProperty("token");
    });
  });

  describe("/auth/me (GET)", () => {
    it("should return current user data", async () => {
      const loginResponse = await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: "admin@example.com", password: "AdminPassword123!" });
      const token = (loginResponse.body as TokenResponse).token;

      const response = await request(app.getHttpServer())
        .get("/auth/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const body = response.body as UserResponse;
      expect(body).toHaveProperty("id");
      expect(body).toHaveProperty("email");
      expect(body.email).toBe("admin@example.com");
      expect(body).toHaveProperty("role");
      expect(body.role).toBe("ADMIN");
      expect(body).not.toHaveProperty("password");
    });

    it("should return user data after registration", async () => {
      const registerResponse = await request(app.getHttpServer())
        .post("/auth/register")
        .send({
          email: "newuser@example.com",
          password: "NewPassword123!",
          username: "newuser",
        });
      const token = (registerResponse.body as TokenResponse).token;

      const response = await request(app.getHttpServer())
        .get("/auth/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const body = response.body as UserResponse;
      expect(body.email).toBe("newuser@example.com");
      expect(body.username).toBe("newuser");
      expect(body.role).toBe("USER");
    });

    it("should return 401 without token", async () => {
      await request(app.getHttpServer()).get("/auth/me").expect(401);
    });

    it("should return 401 with invalid token", async () => {
      await request(app.getHttpServer())
        .get("/auth/me")
        .set("Authorization", "Bearer invalid-token")
        .expect(401);
    });

    it("should return 401 with malformed authorization header", async () => {
      await request(app.getHttpServer())
        .get("/auth/me")
        .set("Authorization", "InvalidFormat token")
        .expect(401);
    });

    it("should return 401 with expired/tampered token", async () => {
      const tamperedToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJzdWIiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNjE2MTYxNjE2fQ.invalid_signature";

      await request(app.getHttpServer())
        .get("/auth/me")
        .set("Authorization", `Bearer ${tamperedToken}`)
        .expect(401);
    });
  });

  describe("Token validation", () => {
    it("should allow access to protected routes with valid token", async () => {
      const loginResponse = await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: "admin@example.com", password: "AdminPassword123!" });
      const token = (loginResponse.body as TokenResponse).token;

      await request(app.getHttpServer())
        .get("/users")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
    });

    it("should deny access to protected routes without token", async () => {
      await request(app.getHttpServer()).get("/users").expect(401);
    });

    it("should work with newly registered user token", async () => {
      const registerResponse = await request(app.getHttpServer())
        .post("/auth/register")
        .send({
          email: "tokentest@example.com",
          password: "TestPassword123!",
        });
      const token = (registerResponse.body as TokenResponse).token;

      const meResponse = await request(app.getHttpServer())
        .get("/auth/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect((meResponse.body as UserResponse).email).toBe(
        "tokentest@example.com",
      );
    });
  });
});
