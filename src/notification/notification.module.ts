import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "./notification.service";
import { EmailService } from "./services/email.service";

@Module({
  imports: [DatabaseModule],
  controllers: [NotificationController],
  providers: [NotificationService, EmailService],
  exports: [NotificationService, EmailService],
})
export class NotificationModule {}
