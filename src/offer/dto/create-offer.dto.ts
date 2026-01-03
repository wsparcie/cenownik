import { Type } from "class-transformer";
import {
  IsArray,
  IsDate,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateOfferDto {
  @ApiProperty({ description: "Unique link to the offer" })
  @IsString()
  @IsNotEmpty()
  link: string;

  @ApiProperty({ description: "Title of the offer" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: "Price" })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: "Description of the offer" })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: "Source of the offer" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  source: string;

  @ApiPropertyOptional({ description: "Creation date" })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  createdAt?: Date;

  @ApiPropertyOptional({ description: "Array of image URLs", isArray: true })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional({ description: "User ID who owns this offer" })
  @IsInt()
  @IsOptional()
  userId?: number;
}
