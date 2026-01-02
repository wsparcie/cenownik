import { Injectable, Logger } from "@nestjs/common";

import { DatabaseService } from "../database/database.service";
import { EmailService } from "./services/email.service";

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly emailService: EmailService,
  ) {}

  async sendPriceMatchNotification(data: {
    userId: number;
    userEmail: string;
    userName: string;
    offer: {
      id: number;
      title: string;
      link: string;
      currentPrice: number;
      targetPrice: number;
      previousPrice: number | null;
      source: string;
      description: string | null;
      images: string[];
      createdAt: Date;
      updatedAt: Date;
    };
  }): Promise<{ emailSent: boolean }> {
    const results = { emailSent: false };

    try {
      const { subject, html } =
        this.emailService.generatePriceMatchNotificationEmail(
          data.userName,
          data.offer,
        );

      results.emailSent = await this.emailService.sendEmail(
        data.userEmail,
        subject,
        html,
      );

      if (results.emailSent) {
        this.logger.log(
          `Email notification sent to ${data.userEmail} for offer #${String(data.offer.id)}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${data.userEmail}:`,
        error instanceof Error ? error.message : String(error),
      );
    }

    return results;
  }

  async isEmailReady(): Promise<boolean> {
    return this.emailService.isTransporterReady();
  }

  async getNotificationHistory(userId?: number) {
    const where = {
      targetPriceReached: true,
      ...(userId === undefined
        ? {}
        : {
            offer: {
              userId,
            },
          }),
    };

    return this.databaseService.priceHistory.findMany({
      where,
      include: {
        offer: {
          select: {
            id: true,
            title: true,
            link: true,
            source: true,
            user: {
              select: {
                id: true,
                email: true,
                username: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });
  }

  async getStats() {
    const [totalOffers, totalPriceMatches, recentMatches] = await Promise.all([
      this.databaseService.offer.count(),
      this.databaseService.priceHistory.count({
        where: { targetPriceReached: true },
      }),
      this.databaseService.priceHistory.count({
        where: {
          targetPriceReached: true,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      totalOffers,
      totalPriceMatches,
      recentMatches,
      emailServiceReady: await this.emailService.isTransporterReady(),
    };
  }

  private readonly sampleOffer = {
    id: 0,
    title: "Karta graficzna GeForce RTX 4070 Ti SUPER",
    link: "https://www.x-kom.pl/p/1234567",
    currentPrice: 3499,
    targetPrice: 3599,
    previousPrice: 3999,
    source: "x-kom",
    description: "12GB GDDR6X, 2610 MHz, 256-bit",
    images: [
      "https://cdn.x-kom.pl/i/setup/images/prod/big/product-new-big,,2024/1/pr_2024_1_16_8_52_10_701_00.jpg",
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  async sendTestEmail(
    email: string,
    userName: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { subject, html } =
        this.emailService.generatePriceMatchNotificationEmail(
          userName,
          this.sampleOffer,
        );

      const sent = await this.emailService.sendEmail(email, subject, html);

      return {
        success: sent,
        message: sent
          ? `Test email sent to ${email}`
          : "Failed to send test email",
      };
    } catch (error) {
      this.logger.error(
        "Failed to send test email:",
        error instanceof Error ? error.message : String(error),
      );
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
