import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";

import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { NotificationModule } from "../notification/notification.module";
import { ScraperController } from "./scraper.controller";
import { ScraperService } from "./scraper.service";
import { MoreleScraper } from "./scrapers/morele.scraper";
import { XkomScraper } from "./scrapers/xkom.scraper";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    NotificationModule,
  ],
  controllers: [ScraperController],
  providers: [ScraperService, MoreleScraper, XkomScraper],
  exports: [ScraperService],
})
export class ScraperModule {}
