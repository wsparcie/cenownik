import { IsOptional, IsString, Matches } from "class-validator";

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SetDiscordWebhookDto {
  @ApiProperty({
    example: "https://discord.com/api/webhooks/123456789/abcdef",
    description: "Discord webhook URL for notifications",
  })
  @IsString()
  @Matches(
    /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+$/,
    {
      message:
        "Invalid Discord webhook URL format. Must be: https://discord.com/api/webhooks/{id}/{token}",
    },
  )
  webhookUrl: string;
}

export class RemoveDiscordWebhookDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  confirm?: string;
}

export class DiscordWebhookResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional()
  webhookUrl?: string | null;

  @ApiPropertyOptional()
  hasWebhook?: boolean;
}
