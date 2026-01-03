import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "./notification.service";
import { DiscordService } from "./services/discord.service";
import { EmailService } from "./services/email.service";

@Module({
  imports: [DatabaseModule],
  controllers: [NotificationController],
  providers: [NotificationService, EmailService, DiscordService],
  exports: [NotificationService, EmailService, DiscordService],
})
export class NotificationModule {}
