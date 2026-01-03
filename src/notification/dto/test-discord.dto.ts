import { IsUrl } from "class-validator";

import { ApiProperty } from "@nestjs/swagger";

export class TestDiscordDto {
  @ApiProperty({ example: "https://discord.com/api/webhooks/..." })
  @IsUrl()
  webhookUrl: string;
}
