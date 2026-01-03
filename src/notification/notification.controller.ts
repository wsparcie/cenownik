import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { TestDiscordDto } from "./dto/test-discord.dto";
import { TestEmailDto } from "./dto/test-email.dto";
import { ValidateWebhookDto } from "./dto/validate-webhook.dto";
import { NotificationService } from "./notification.service";
import { EmailService } from "./services/email.service";

@ApiTags("notifications")
@Controller("notifications")
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
  ) {}

  @Get("stats")
  @ApiOperation({
    summary: "Get notification statistics",
    description:
      "Returns statistics about offers and price match notifications",
  })
  @ApiResponse({
    status: 200,
    description: "Statistics retrieved successfully",
  })
  async getStats() {
    return this.notificationService.getStats();
  }

  @Get("history")
  @ApiOperation({
    summary: "Get notification history",
    description: "Returns history of price matches",
  })
  @ApiResponse({
    status: 200,
    description: "History retrieved successfully",
  })
  async getHistory(@Query("userId") userId?: string) {
    const parsedUserId =
      userId === undefined ? undefined : Number.parseInt(userId, 10);
    return this.notificationService.getNotificationHistory(parsedUserId);
  }

  @Get("status")
  @ApiOperation({
    summary: "Check notification services status",
    description: "Returns the status of email and Discord services",
  })
  @ApiResponse({
    status: 200,
    description: "Status retrieved successfully",
  })
  async getStatus() {
    const emailReady = await this.notificationService.isEmailReady();

    return {
      email: {
        ready: emailReady,
        type: "Gmail OAuth2",
      },
      discord: {
        ready: true,
        type: "Webhook",
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get("health/email")
  @ApiOperation({ summary: "Check Email service health status" })
  @ApiResponse({ status: 200, description: "Email health check completed" })
  async checkEmailHealth() {
    try {
      const isInitialized = await this.emailService.isTransporterReady();
      const authType = this.emailService.getAuthType();

      return {
        status: isInitialized ? "healthy" : "unhealthy",
        service: "email",
        timestamp: new Date().toISOString(),
        details: {
          transporterReady: isInitialized,
          authType,
          configuration: this.getEmailConfigStatus(),
        },
      };
    } catch (error) {
      return {
        status: "unhealthy",
        service: "email",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  @Get("health/discord")
  @ApiOperation({ summary: "Check Discord webhook service health status" })
  @ApiResponse({ status: 200, description: "Discord health check completed" })
  checkDiscordHealth() {
    return {
      status: "healthy",
      service: "discord",
      timestamp: new Date().toISOString(),
      message: "Discord webhook notification service is ready",
      details: {
        type: "webhook",
        description:
          "Users provide their own Discord webhook URLs for notifications",
      },
    };
  }

  private getEmailConfigStatus() {
    const hasOAuth2Gmail =
      process.env.EMAIL_OAUTH_CLIENT_ID !== undefined &&
      process.env.EMAIL_OAUTH_CLIENT_ID !== "" &&
      process.env.EMAIL_OAUTH_CLIENT_SECRET !== undefined &&
      process.env.EMAIL_OAUTH_CLIENT_SECRET !== "" &&
      process.env.EMAIL_OAUTH_REFRESH_TOKEN !== undefined &&
      process.env.EMAIL_OAUTH_REFRESH_TOKEN !== "" &&
      process.env.EMAIL_OAUTH_USER !== undefined &&
      process.env.EMAIL_OAUTH_USER !== "";

    const hasSMTP =
      process.env.SMTP_HOST !== undefined &&
      process.env.SMTP_HOST !== "" &&
      process.env.SMTP_USER !== undefined &&
      process.env.SMTP_USER !== "";

    return {
      oauth2Gmail: hasOAuth2Gmail,
      smtp: hasSMTP,
      configured: hasOAuth2Gmail || hasSMTP,
      missingCredentials:
        !hasOAuth2Gmail && !hasSMTP
          ? "Configure either EMAIL_OAUTH_* (Gmail OAuth2) or SMTP_* (SMTP) environment variables"
          : null,
    };
  }

  @Post("test/email")
  @ApiOperation({ summary: "Send a test email notification" })
  @ApiResponse({ status: 200, description: "Test email sent successfully" })
  @ApiResponse({ status: 500, description: "Failed to send test email" })
  async sendTestEmail(@Body() dto: TestEmailDto) {
    return this.notificationService.sendTestEmail(
      dto.email,
      dto.userName ?? "Użytkownik",
    );
  }

  @Post("test/discord")
  @ApiOperation({ summary: "Send a test Discord notification" })
  @ApiResponse({ status: 200, description: "Test Discord sent successfully" })
  @ApiResponse({ status: 500, description: "Failed to send test Discord" })
  async sendTestDiscord(@Body() dto: TestDiscordDto) {
    return this.notificationService.sendTestDiscord(dto.webhookUrl);
  }

  @Post("validate/discord")
  @ApiOperation({ summary: "Validate a Discord webhook URL" })
  @ApiResponse({ status: 200, description: "Webhook validation completed" })
  async validateDiscordWebhook(@Body() dto: ValidateWebhookDto) {
    return this.notificationService.validateDiscordWebhook(dto.webhookUrl);
  }
}
