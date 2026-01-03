import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { DatabaseService } from "../database/database.service";
import { NotificationService } from "./notification.service";
import { DiscordService } from "./services/discord.service";
import { EmailService } from "./services/email.service";

const mockDatabaseService = {
  offer: {
    count: jest.fn(),
  },
  priceHistory: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
};

const mockEmailService = {
  sendEmail: jest.fn(),
  generatePriceMatchNotificationEmail: jest.fn(),
  isTransporterReady: jest.fn(),
};

const mockDiscordService = {
  sendPriceMatchNotification: jest.fn(),
  isValidWebhookUrl: jest.fn(),
  validateWebhook: jest.fn(),
  sendWebhookMessage: jest.fn(),
  generatePriceMatchPayload: jest.fn(),
};

describe("NotificationService", () => {
  let service: NotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: DiscordService, useValue: mockDiscordService },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("sendPriceMatchNotification", () => {
    const mockNotificationData = {
      userId: 1,
      userEmail: "test@example.com",
      userName: "Jan",
      discordWebhookUrl: "https://discord.com/api/webhooks/123/abc",
      offer: {
        id: 1,
        title: "Test Product",
        link: "https://example.com/product",
        currentPrice: 80,
        targetPrice: 90,
        previousPrice: 100,
        source: "morele",
        description: "Test description",
        images: ["https://example.com/image.jpg"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    it("should send email and discord notification successfully", async () => {
      mockEmailService.generatePriceMatchNotificationEmail.mockReturnValue({
        subject: "Price Alert",
        html: "<html>...</html>",
      });
      mockEmailService.sendEmail.mockResolvedValue(true);
      mockDiscordService.sendPriceMatchNotification.mockResolvedValue(true);

      const result =
        await service.sendPriceMatchNotification(mockNotificationData);

      expect(result).toEqual({ emailSent: true, discordSent: true });
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        "test@example.com",
        "Price Alert",
        "<html>...</html>",
      );
      expect(mockDiscordService.sendPriceMatchNotification).toHaveBeenCalled();
    });

    it("should handle email failure gracefully", async () => {
      mockEmailService.generatePriceMatchNotificationEmail.mockReturnValue({
        subject: "Price Alert",
        html: "<html>...</html>",
      });
      mockEmailService.sendEmail.mockRejectedValue(new Error("SMTP error"));
      mockDiscordService.sendPriceMatchNotification.mockResolvedValue(true);

      const result =
        await service.sendPriceMatchNotification(mockNotificationData);

      expect(result).toEqual({ emailSent: false, discordSent: true });
    });

    it("should skip discord when no webhook URL provided", async () => {
      mockEmailService.generatePriceMatchNotificationEmail.mockReturnValue({
        subject: "Price Alert",
        html: "<html>...</html>",
      });
      mockEmailService.sendEmail.mockResolvedValue(true);

      const dataWithoutDiscord = {
        ...mockNotificationData,
        discordWebhookUrl: null,
      };

      const result =
        await service.sendPriceMatchNotification(dataWithoutDiscord);

      expect(result).toEqual({ emailSent: true, discordSent: false });
      expect(
        mockDiscordService.sendPriceMatchNotification,
      ).not.toHaveBeenCalled();
    });
  });

  describe("validateDiscordWebhook", () => {
    it("should return invalid for malformed URL", async () => {
      mockDiscordService.isValidWebhookUrl.mockReturnValue(false);

      const result = await service.validateDiscordWebhook("invalid-url");

      expect(result).toEqual({
        valid: false,
        message: "Invalid Discord webhook URL format",
      });
    });

    it("should return valid for valid webhook", async () => {
      mockDiscordService.isValidWebhookUrl.mockReturnValue(true);
      mockDiscordService.validateWebhook.mockResolvedValue(true);

      const result = await service.validateDiscordWebhook(
        "https://discord.com/api/webhooks/123/abc",
      );

      expect(result).toEqual({
        valid: true,
        message: "Webhook is valid",
      });
    });

    it("should handle validation errors", async () => {
      mockDiscordService.isValidWebhookUrl.mockReturnValue(true);
      mockDiscordService.validateWebhook.mockRejectedValue(
        new Error("Network error"),
      );

      const result = await service.validateDiscordWebhook(
        "https://discord.com/api/webhooks/123/abc",
      );

      expect(result).toEqual({
        valid: false,
        message: "Network error",
      });
    });
  });

  describe("isEmailReady", () => {
    it("should return true when transporter is ready", async () => {
      mockEmailService.isTransporterReady.mockResolvedValue(true);

      const result = await service.isEmailReady();

      expect(result).toBe(true);
    });

    it("should return false when transporter is not ready", async () => {
      mockEmailService.isTransporterReady.mockResolvedValue(false);

      const result = await service.isEmailReady();

      expect(result).toBe(false);
    });
  });

  describe("getNotificationHistory", () => {
    it("should fetch history without userId filter", async () => {
      const mockHistory = [
        { id: 1, targetPriceReached: true, offer: { title: "Product" } },
      ];
      mockDatabaseService.priceHistory.findMany.mockResolvedValue(mockHistory);

      const result = await service.getNotificationHistory();

      expect(result).toEqual(mockHistory);
      expect(mockDatabaseService.priceHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { targetPriceReached: true },
        }),
      );
    });

    it("should fetch history with userId filter", async () => {
      const mockHistory = [
        { id: 1, targetPriceReached: true, offer: { title: "Product" } },
      ];
      mockDatabaseService.priceHistory.findMany.mockResolvedValue(mockHistory);

      const result = await service.getNotificationHistory(123);

      expect(result).toEqual(mockHistory);
      expect(mockDatabaseService.priceHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { targetPriceReached: true, offer: { userId: 123 } },
        }),
      );
    });
  });

  describe("getStats", () => {
    it("should return notification statistics", async () => {
      mockDatabaseService.offer.count.mockResolvedValue(10);
      mockDatabaseService.priceHistory.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(2);
      mockEmailService.isTransporterReady.mockResolvedValue(true);

      const result = await service.getStats();

      expect(result).toEqual({
        totalOffers: 10,
        totalPriceMatches: 5,
        recentMatches: 2,
        emailServiceReady: true,
      });
    });
  });

  describe("sendTestEmail", () => {
    it("should send a test email successfully", async () => {
      mockEmailService.generatePriceMatchNotificationEmail.mockReturnValue({
        subject: "Test Subject",
        html: "<html>Test</html>",
      });
      mockEmailService.sendEmail.mockResolvedValue(true);

      const result = await service.sendTestEmail("test@example.com", "Jan");

      expect(result.success).toBe(true);
      expect(result.message).toContain("test@example.com");
    });

    it("should return failure when email sending fails", async () => {
      mockEmailService.generatePriceMatchNotificationEmail.mockReturnValue({
        subject: "Test Subject",
        html: "<html>Test</html>",
      });
      mockEmailService.sendEmail.mockResolvedValue(false);

      const result = await service.sendTestEmail("test@example.com", "Jan");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Failed to send test email");
    });
  });

  describe("sendTestDiscord", () => {
    it("should send a test Discord notification successfully", async () => {
      mockDiscordService.sendPriceMatchNotification.mockResolvedValue(true);

      const result = await service.sendTestDiscord(
        "https://discord.com/api/webhooks/123/abc",
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe("Test Discord notification sent");
    });

    it("should return failure when Discord notification fails", async () => {
      mockDiscordService.sendPriceMatchNotification.mockResolvedValue(false);

      const result = await service.sendTestDiscord(
        "https://discord.com/api/webhooks/123/abc",
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe("Failed to send Discord notification");
    });
  });
});
