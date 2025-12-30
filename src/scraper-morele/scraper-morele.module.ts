import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";

import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { ScraperMoreleController } from "./scraper-morele.controller";
import { ScraperMoreleService } from "./scraper-morele.service";

@Module({
  imports: [ScheduleModule.forRoot(), DatabaseModule, AuthModule],
  controllers: [ScraperMoreleController],
  providers: [ScraperMoreleService],
  exports: [ScraperMoreleService],
})
export class ScraperMoreleModule {}
