import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { DiscordService } from "./discord.service";

describe("DiscordService", () => {
  let service: DiscordService;
  let mockFetch: jest.Mock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiscordService],
    }).compile();

    service = module.get<DiscordService>(DiscordService);
    mockFetch = jest.fn();
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("isValidWebhookUrl", () => {
    it("should return true for valid discord webhook URL", () => {
      const validUrls = [
        "https://discord.com/api/webhooks/123456789/abcdef",
        "https://discordapp.com/api/webhooks/123456789/abcdef",
      ];

      for (const url of validUrls) {
        expect(service.isValidWebhookUrl(url)).toBe(true);
      }
    });

    it("should return false for invalid URLs", () => {
      const invalidUrls = [
        "https://example.com/webhook",
        "https://discord.com/other/path",
        "not-a-url",
        "",
      ];

      for (const url of invalidUrls) {
        expect(service.isValidWebhookUrl(url)).toBe(false);
      }
    });
  });

  describe("generatePriceMatchPayload", () => {
    const mockData = {
      userName: "Jan",
      offer: {
        id: 1,
        title: "Test Product",
        link: "https://morele.net/product",
        currentPrice: 80,
        targetPrice: 90,
        previousPrice: 100,
        source: "morele",
        description: "Test description",
        images: ["https://example.com/image.jpg"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      priceDropPercentage: 20,
      savingsAmount: 20,
    };

    it("should generate valid Discord webhook payload", () => {
      const payload = service.generatePriceMatchPayload(mockData);

      expect(payload).toHaveProperty("embeds");
      expect(payload.embeds).toHaveLength(1);

      const embed = payload.embeds?.[0];
      expect(embed?.title).toBe("Test Product");
      expect(embed?.url).toBe("https://morele.net/product");
    });

    it("should include price information in payload", () => {
      const payload = service.generatePriceMatchPayload(mockData);

      const embed = payload.embeds?.[0];
      const description = embed?.description ?? "";

      expect(description).toContain("80");
      expect(description).toContain("90");
    });

    it("should include image when available", () => {
      const payload = service.generatePriceMatchPayload(mockData);

      expect(payload.embeds?.[0]?.image?.url).toBe(
        "https://example.com/image.jpg",
      );
    });

    it("should handle missing image", () => {
      const dataWithoutImage = {
        ...mockData,
        offer: { ...mockData.offer, images: [] },
      };

      const payload = service.generatePriceMatchPayload(dataWithoutImage);

      expect(payload.embeds?.[0]?.image).toBeUndefined();
    });

    it("should use source-specific color", () => {
      const payload = service.generatePriceMatchPayload(mockData);

      const embed = payload.embeds?.[0];
      expect(embed?.color).toBeDefined();
      expect(typeof embed?.color).toBe("number");
    });
  });

  describe("sendWebhookMessage", () => {
    it("should return false for invalid webhook URL", async () => {
      const result = await service.sendWebhookMessage("invalid-url", {
        content: "Test",
      });

      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should send webhook message successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const result = await service.sendWebhookMessage(
        "https://discord.com/api/webhooks/123/abc",
        { content: "Test" },
      );

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://discord.com/api/webhooks/123/abc",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    it("should handle rate limiting", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Map([["Retry-After", "1"]]),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 204,
        });

      const result = await service.sendWebhookMessage(
        "https://discord.com/api/webhooks/123/abc",
        { content: "Test" },
        2,
      );

      expect(result).toBe(true);
    });

    it("should retry on failure", async () => {
      mockFetch
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          ok: true,
          status: 204,
        });

      const result = await service.sendWebhookMessage(
        "https://discord.com/api/webhooks/123/abc",
        { content: "Test" },
        2,
      );

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should fail after all retries exhausted", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await service.sendWebhookMessage(
        "https://discord.com/api/webhooks/123/abc",
        { content: "Test" },
        2,
      );

      expect(result).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("validateWebhook", () => {
    it("should return true for valid webhook", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ id: "123", name: "Test Webhook" }),
      });

      const result = await service.validateWebhook(
        "https://discord.com/api/webhooks/123/abc",
      );

      expect(result).toBe(true);
    });

    it("should return false for invalid webhook", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await service.validateWebhook(
        "https://discord.com/api/webhooks/123/abc",
      );

      expect(result).toBe(false);
    });
  });

  describe("sendPriceMatchNotification", () => {
    const mockData = {
      userName: "Jan",
      offer: {
        id: 1,
        title: "Test Product",
        link: "https://morele.net/product",
        currentPrice: 80,
        targetPrice: 90,
        previousPrice: 100,
        source: "morele",
        description: "Test description",
        images: ["https://example.com/image.jpg"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      priceDropPercentage: 20,
      savingsAmount: 20,
    };

    it("should send price match notification", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const result = await service.sendPriceMatchNotification(
        "https://discord.com/api/webhooks/123/abc",
        mockData,
      );

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
    });
  });
});
