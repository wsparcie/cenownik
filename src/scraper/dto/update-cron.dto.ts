import { IsNotEmpty, IsString } from "class-validator";

import { ApiProperty } from "@nestjs/swagger";

import { CronMinInterval } from "../../validators/cron.validator";

export class UpdateCronDto {
  @ApiProperty({
    description: "Cron expression for scraping schedule",
    example: "*/30 * * * *",
  })
  @IsString()
  @IsNotEmpty()
  @CronMinInterval({
    message: "Cron interval must be at least 10 minutes to avoid rate limiting",
  })
  cron: string;
}
