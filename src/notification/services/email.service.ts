import * as nodemailer from "nodemailer";

import { Injectable, Logger } from "@nestjs/common";

import { generatePriceMatchNotificationTemplate } from "../dto/price-match-notification.template";
import type { PriceMatchNotificationData } from "../dto/price-match-notification.template";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private authType: "oauth2" | "smtp" | "none" = "none";

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    if (this.tryInitializeOAuth2()) {
      return;
    }

    if (this.tryInitializeSMTP()) {
      return;
    }

    this.logger.warn(
      "Email service disabled. Configure either Gmail OAuth2 or SMTP credentials.",
    );
    this.logger.warn(
      "Gmail OAuth2: EMAIL_OAUTH_CLIENT_ID, EMAIL_OAUTH_CLIENT_SECRET, EMAIL_OAUTH_REFRESH_TOKEN, EMAIL_OAUTH_USER",
    );
    this.logger.warn("SMTP: SMTP_HOST, SMTP_USER, SMTP_PASS");
  }

  private tryInitializeOAuth2(): boolean {
    const clientId = process.env.EMAIL_OAUTH_CLIENT_ID;
    const clientSecret = process.env.EMAIL_OAUTH_CLIENT_SECRET;
    const refreshToken = process.env.EMAIL_OAUTH_REFRESH_TOKEN;
    const user = process.env.EMAIL_OAUTH_USER;

    if (
      clientId === undefined ||
      clientId === "" ||
      clientSecret === undefined ||
      clientSecret === "" ||
      refreshToken === undefined ||
      refreshToken === "" ||
      user === undefined ||
      user === ""
    ) {
      return false;
    }

    try {
      this.transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          type: "OAuth2",
          user,
          clientId,
          clientSecret,
          refreshToken,
        },
      });

      this.authType = "oauth2";
      this.logger.log(
        `Email service initialized with Gmail OAuth2 for ${user}`,
      );

      void this.verifyTransporter();
      return true;
    } catch (error) {
      this.logger.error(
        "Failed to initialize Gmail OAuth2:",
        error instanceof Error ? error.message : String(error),
      );
      return false;
    }
  }

  private tryInitializeSMTP(): boolean {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (
      host === undefined ||
      host === "" ||
      user === undefined ||
      user === "" ||
      pass === undefined ||
      pass === ""
    ) {
      return false;
    }

    try {
      const port = Number.parseInt(process.env.SMTP_PORT ?? "587", 10);

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });

      this.authType = "smtp";
      this.logger.log(
        `Email service initialized with SMTP: ${host}:${String(port)}`,
      );

      void this.verifyTransporter();
      return true;
    } catch (error) {
      this.logger.error(
        "Failed to initialize SMTP:",
        error instanceof Error ? error.message : String(error),
      );
      return false;
    }
  }

  private async verifyTransporter(): Promise<void> {
    if (this.transporter === null) {
      return;
    }

    try {
      await this.transporter.verify();
      this.logger.log("Email transporter verified successfully");
    } catch (error) {
      this.logger.error(
        "Email transporter verification failed:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    retries = 3,
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        if (this.transporter === null) {
          this.logger.error("Email transporter not initialized");
          return false;
        }

        const from =
          process.env.EMAIL_FROM ??
          process.env.SMTP_FROM ??
          process.env.EMAIL_OAUTH_USER ??
          '"Cenownik" <noreply@cenownik.local>';

        const mailOptions = {
          from,
          to,
          subject,
          html,
          headers: {
            "X-Mailer": "Cenownik Price Alert System",
            "X-Priority": "3",
          },
        };

        this.logger.debug(
          `Sending email to ${to} (attempt ${String(attempt)}/${String(retries)})`,
        );

        /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
        const info = await this.transporter.sendMail(mailOptions);

        if (process.env.NODE_ENV === "development") {
          const previewUrl = nodemailer.getTestMessageUrl(info);
          if (previewUrl !== false) {
            this.logger.log(`Preview URL: ${previewUrl}`);
          }
        }

        this.logger.log(`Email sent to ${to}: ${String(info.messageId)}`);
        /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
        return true;
      } catch (error) {
        const isLastAttempt = attempt === retries;
        this.logger.error(
          `Failed to send email (attempt ${String(attempt)}/${String(retries)}):`,
          error instanceof Error ? error.message : String(error),
        );

        if (isLastAttempt) {
          return false;
        }

        const delay = 2 ** (attempt - 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return false;
  }

  async isTransporterReady(): Promise<boolean> {
    if (this.transporter === null) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }

  getAuthType(): string {
    return this.authType;
  }

  generatePriceMatchNotificationEmail(
    userName: string,
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
    },
  ): { subject: string; html: string } {
    const priceDropPercentage =
      offer.previousPrice !== null && offer.previousPrice > 0
        ? ((offer.previousPrice - offer.currentPrice) / offer.previousPrice) *
          100
        : 0;

    const savingsAmount =
      offer.previousPrice === null
        ? 0
        : offer.previousPrice - offer.currentPrice;

    const notificationData: PriceMatchNotificationData = {
      userName,
      offer,
      priceDropPercentage,
      savingsAmount,
    };

    return generatePriceMatchNotificationTemplate(notificationData);
  }
}
