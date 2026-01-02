import { IsEmail, IsOptional, IsString } from "class-validator";

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class TestEmailDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: "Jan" })
  @IsOptional()
  @IsString()
  userName?: string;
}
