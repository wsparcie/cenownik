import { ApiProperty } from "@nestjs/swagger";

export class DatabaseStatsDto {
  @ApiProperty()
  users: number;

  @ApiProperty()
  offers: number;

  @ApiProperty()
  timestamp: Date;
}
