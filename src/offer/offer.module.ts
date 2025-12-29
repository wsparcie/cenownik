import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { OfferController } from "./offer.controller";
import { OfferService } from "./offer.service";

@Module({
  controllers: [OfferController],
  providers: [OfferService],
  imports: [DatabaseModule, AuthModule],
  exports: [OfferService],
})
export class OfferModule {}
