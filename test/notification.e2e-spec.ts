import request from "supertest";
import type { App } from "supertest/types";

import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { AppModule } from "../src/app.module";
import { cleanDatabase } from "./clean-database";
import { seedDatabase } from "./seed-database";

interface StatsResponse {
  totalOffers: number;
  totalPriceMatches: number;
  recentMatches: number;
  emailServiceReady: boolean;
}

interface StatusResponse {
  email: {
    ready: boolean;
    type: string;
  };
  discord: {
    ready: boolean;
    type: string;
  };
  timestamp: string;
}

interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
  details?: Record<string, unknown>;
  message?: string;
  error?: string;
}

describe("NotificationController (e2e)", () => {
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

  describe("/notifications/stats (GET)", () => {
    it("should return notification statistics", async () => {
      const response = await request(app.getHttpServer())
        .get("/notifications/stats")
        .expect(200);

      const body = response.body as StatsResponse;
      expect(body).toHaveProperty("totalOffers");
      expect(body).toHaveProperty("totalPriceMatches");
      expect(body).toHaveProperty("recentMatches");
      expect(body).toHaveProperty("emailServiceReady");
      expect(typeof body.totalOffers).toBe("number");
      expect(typeof body.totalPriceMatches).toBe("number");
      expect(typeof body.recentMatches).toBe("number");
      expect(typeof body.emailServiceReady).toBe("boolean");
    });
  });

  describe("/notifications/history (GET)", () => {
    it("should return notification history", async () => {
      const response = await request(app.getHttpServer())
        .get("/notifications/history")
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it("should filter history by userId", async () => {
      const response = await request(app.getHttpServer())
        .get("/notifications/history?userId=1")
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe("/notifications/status (GET)", () => {
    it("should return notification services status", async () => {
      const response = await request(app.getHttpServer())
        .get("/notifications/status")
        .expect(200);

      const body = response.body as StatusResponse;
      expect(body).toHaveProperty("email");
      expect(body).toHaveProperty("discord");
      expect(body).toHaveProperty("timestamp");
      expect(body.email).toHaveProperty("ready");
      expect(body.email).toHaveProperty("type");
      expect(body.discord).toHaveProperty("ready");
      expect(body.discord).toHaveProperty("type");
      expect(body.discord.ready).toBe(true);
      expect(body.discord.type).toBe("Webhook");
    });
  });

  describe("/notifications/health/email (GET)", () => {
    it("should return email service health status", async () => {
      const response = await request(app.getHttpServer())
        .get("/notifications/health/email")
        .expect(200);

      const body = response.body as HealthResponse;
      expect(body).toHaveProperty("status");
      expect(body).toHaveProperty("service");
      expect(body).toHaveProperty("timestamp");
      expect(body.service).toBe("email");
      expect(["healthy", "unhealthy"]).toContain(body.status);
    });
  });

  describe("/notifications/health/discord (GET)", () => {
    it("should return discord service health status", async () => {
      const response = await request(app.getHttpServer())
        .get("/notifications/health/discord")
        .expect(200);

      const body = response.body as HealthResponse;
      expect(body).toHaveProperty("status");
      expect(body).toHaveProperty("service");
      expect(body).toHaveProperty("timestamp");
      expect(body).toHaveProperty("message");
      expect(body).toHaveProperty("details");
      expect(body.status).toBe("healthy");
      expect(body.service).toBe("discord");
      expect(body.message).toBe(
        "Discord webhook notification service is ready",
      );
    });
  });

  describe("/notifications/test/email (POST)", () => {
    it("should accept valid email test request", async () => {
      const response = await request(app.getHttpServer())
        .post("/notifications/test/email")
        .send({ email: "test@example.com", userName: "Test User" })
        .expect(201);

      const body = response.body as { success: boolean; message: string };
      expect(body).toHaveProperty("success");
      expect(body).toHaveProperty("message");
      expect(typeof body.success).toBe("boolean");
    });

    it("should reject invalid email format", async () => {
      await request(app.getHttpServer())
        .post("/notifications/test/email")
        .send({ email: "invalid-email" })
        .expect(400);
    });

    it("should reject request without email", async () => {
      await request(app.getHttpServer())
        .post("/notifications/test/email")
        .send({})
        .expect(400);
    });

    it("should accept request without userName (optional)", async () => {
      const response = await request(app.getHttpServer())
        .post("/notifications/test/email")
        .send({ email: "test@example.com" })
        .expect(201);

      const body = response.body as { success: boolean; message: string };
      expect(body).toHaveProperty("success");
    });
  });

  describe("/notifications/test/discord (POST)", () => {
    it("should accept valid webhook URL", async () => {
      const response = await request(app.getHttpServer())
        .post("/notifications/test/discord")
        .send({
          webhookUrl: "https://discord.com/api/webhooks/123456789/abcdefgh",
        })
        .expect(201);

      const body = response.body as { success: boolean; message: string };
      expect(body).toHaveProperty("success");
      expect(body).toHaveProperty("message");
    });

    it("should reject invalid webhook URL format", async () => {
      await request(app.getHttpServer())
        .post("/notifications/test/discord")
        .send({ webhookUrl: "not-a-valid-url" })
        .expect(400);
    });

    it("should reject request without webhookUrl", async () => {
      await request(app.getHttpServer())
        .post("/notifications/test/discord")
        .send({})
        .expect(400);
    });
  });

  describe("/notifications/validate/discord (POST)", () => {
    it("should validate a webhook URL format", async () => {
      const response = await request(app.getHttpServer())
        .post("/notifications/validate/discord")
        .send({
          webhookUrl: "https://discord.com/api/webhooks/123456789/abcdefgh",
        })
        .expect(201);

      const body = response.body as { valid: boolean; message: string };
      expect(body).toHaveProperty("valid");
      expect(body).toHaveProperty("message");
      expect(typeof body.valid).toBe("boolean");
    });

    it("should reject invalid URL format", async () => {
      await request(app.getHttpServer())
        .post("/notifications/validate/discord")
        .send({ webhookUrl: "invalid" })
        .expect(400);
    });

    it("should reject request without webhookUrl", async () => {
      await request(app.getHttpServer())
        .post("/notifications/validate/discord")
        .send({})
        .expect(400);
    });
  });
});
