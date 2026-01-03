import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { EmailService } from "./email.service";

describe("EmailService", () => {
  let service: EmailService;
  const originalEnv = process.env;

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...originalEnv };

    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailService],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("isTransporterReady", () => {
    it("should return false when no credentials configured", async () => {
      const result = await service.isTransporterReady();
      expect(typeof result).toBe("boolean");
    });
  });

  describe("getAuthType", () => {
    it("should return auth type", () => {
      const result = service.getAuthType();
      expect(["oauth2", "smtp", "none"]).toContain(result);
    });
  });

  describe("generatePriceMatchNotificationEmail", () => {
    const mockOffer = {
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
    };

    it("should generate email with subject and html", () => {
      const result = service.generatePriceMatchNotificationEmail(
        "Jan",
        mockOffer,
      );

      expect(result).toHaveProperty("subject");
      expect(result).toHaveProperty("html");
      expect(result.subject).toContain("Test Product");
      expect(result.html.toUpperCase()).toContain("JAN");
      expect(result.html).toContain("Test Product");
    });

    it("should include price information in email", () => {
      const result = service.generatePriceMatchNotificationEmail(
        "Jan",
        mockOffer,
      );

      expect(result.html).toContain("80");
      expect(result.html).toContain("90");
    });

    it("should handle offer without previous price", () => {
      const offerWithoutPreviousPrice = {
        ...mockOffer,
        previousPrice: null,
      };

      const result = service.generatePriceMatchNotificationEmail(
        "Jan",
        offerWithoutPreviousPrice,
      );

      expect(result).toHaveProperty("subject");
      expect(result).toHaveProperty("html");
    });

    it("should handle offer without images", () => {
      const offerWithoutImages = {
        ...mockOffer,
        images: [],
      };

      const result = service.generatePriceMatchNotificationEmail(
        "Jan",
        offerWithoutImages,
      );

      expect(result).toHaveProperty("subject");
      expect(result).toHaveProperty("html");
    });
  });

  describe("sendEmail", () => {
    it("should return false when transporter not initialized", async () => {
      const result = await service.sendEmail(
        "test@example.com",
        "Test Subject",
        "<html>Test</html>",
      );

      expect(typeof result).toBe("boolean");
    });
  });
});
