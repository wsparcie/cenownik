import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { NotificationController } from "./notification.controller";
import { NotificationService } from "./notification.service";
import { EmailService } from "./services/email.service";

const mockNotificationService = {
  getStats: jest.fn(),
  getNotificationHistory: jest.fn(),
  isEmailReady: jest.fn(),
  validateDiscordWebhook: jest.fn(),
  sendTestEmail: jest.fn(),
  sendTestDiscord: jest.fn(),
};

const mockEmailService = {
  isTransporterReady: jest.fn(),
  getAuthType: jest.fn(),
};

describe("NotificationController", () => {
  let controller: NotificationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getStats", () => {
    it("should return notification statistics", async () => {
      const mockStats = {
        totalOffers: 10,
        totalPriceMatches: 5,
        recentMatches: 2,
        emailServiceReady: true,
      };
      mockNotificationService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(result).toEqual(mockStats);
      expect(mockNotificationService.getStats).toHaveBeenCalled();
    });
  });

  describe("getHistory", () => {
    it("should return notification history without userId", async () => {
      const mockHistory = [{ id: 1, targetPriceReached: true }];
      mockNotificationService.getNotificationHistory.mockResolvedValue(
        mockHistory,
      );

      const result = await controller.getHistory();

      expect(result).toEqual(mockHistory);
      expect(
        mockNotificationService.getNotificationHistory,
      ).toHaveBeenCalledWith(undefined);
    });

    it("should return notification history with userId", async () => {
      const mockHistory = [{ id: 1, targetPriceReached: true }];
      mockNotificationService.getNotificationHistory.mockResolvedValue(
        mockHistory,
      );

      const result = await controller.getHistory("123");

      expect(result).toEqual(mockHistory);
      expect(
        mockNotificationService.getNotificationHistory,
      ).toHaveBeenCalledWith(123);
    });
  });

  describe("getStatus", () => {
    it("should return services status", async () => {
      mockNotificationService.isEmailReady.mockResolvedValue(true);

      const result = await controller.getStatus();

      expect(result).toMatchObject({
        email: { ready: true, type: "Gmail OAuth2" },
        discord: { ready: true, type: "Webhook (no bot required)" },
      });
      expect(result.timestamp).toBeDefined();
    });
  });

  describe("checkEmailHealth", () => {
    it("should return healthy status when transporter is ready", async () => {
      mockEmailService.isTransporterReady.mockResolvedValue(true);
      mockEmailService.getAuthType.mockReturnValue("oauth2");

      const result = await controller.checkEmailHealth();

      expect(result.status).toBe("healthy");
      expect(result.service).toBe("email");
      expect(result.details?.transporterReady).toBe(true);
      expect(result.details?.authType).toBe("oauth2");
    });

    it("should return unhealthy status when transporter is not ready", async () => {
      mockEmailService.isTransporterReady.mockResolvedValue(false);
      mockEmailService.getAuthType.mockReturnValue("none");

      const result = await controller.checkEmailHealth();

      expect(result.status).toBe("unhealthy");
      expect(result.details?.transporterReady).toBe(false);
    });

    it("should return unhealthy status on error", async () => {
      mockEmailService.isTransporterReady.mockRejectedValue(
        new Error("Connection failed"),
      );

      const result = await controller.checkEmailHealth();

      expect(result.status).toBe("unhealthy");
      expect(result.error).toBe("Connection failed");
    });
  });

  describe("checkDiscordHealth", () => {
    it("should return healthy status", () => {
      const result = controller.checkDiscordHealth();

      expect(result.status).toBe("healthy");
      expect(result.service).toBe("discord");
      expect(result.message).toBe(
        "Discord webhook notification service is ready",
      );
    });
  });

  describe("sendTestEmail", () => {
    it("should send a test email", async () => {
      const mockResult = { success: true, message: "Email sent" };
      mockNotificationService.sendTestEmail.mockResolvedValue(mockResult);

      const result = await controller.sendTestEmail({
        email: "test@example.com",
        userName: "Jan",
      });

      expect(result).toEqual(mockResult);
      expect(mockNotificationService.sendTestEmail).toHaveBeenCalledWith(
        "test@example.com",
        "Jan",
      );
    });

    it("should use default userName if not provided", async () => {
      const mockResult = { success: true, message: "Email sent" };
      mockNotificationService.sendTestEmail.mockResolvedValue(mockResult);

      const result = await controller.sendTestEmail({
        email: "test@example.com",
      });

      expect(result).toEqual(mockResult);
      expect(mockNotificationService.sendTestEmail).toHaveBeenCalledWith(
        "test@example.com",
        "Użytkownik",
      );
    });
  });

  describe("sendTestDiscord", () => {
    it("should send a test Discord notification", async () => {
      const mockResult = {
        success: true,
        message: "Discord notification sent",
      };
      mockNotificationService.sendTestDiscord.mockResolvedValue(mockResult);

      const result = await controller.sendTestDiscord({
        webhookUrl: "https://discord.com/api/webhooks/123/abc",
      });

      expect(result).toEqual(mockResult);
      expect(mockNotificationService.sendTestDiscord).toHaveBeenCalledWith(
        "https://discord.com/api/webhooks/123/abc",
      );
    });
  });

  describe("validateDiscordWebhook", () => {
    it("should validate a Discord webhook", async () => {
      const mockResult = { valid: true, message: "Webhook is valid" };
      mockNotificationService.validateDiscordWebhook.mockResolvedValue(
        mockResult,
      );

      const result = await controller.validateDiscordWebhook({
        webhookUrl: "https://discord.com/api/webhooks/123/abc",
      });

      expect(result).toEqual(mockResult);
      expect(
        mockNotificationService.validateDiscordWebhook,
      ).toHaveBeenCalledWith("https://discord.com/api/webhooks/123/abc");
    });
  });
});
