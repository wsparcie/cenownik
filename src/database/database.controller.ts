import { Role } from "@prisma/client";

import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles/role.decorator";
import { RoleGuard } from "../auth/roles/role.guard";
import { DatabaseService } from "./database.service";
import type { DatabaseRequest } from "./dto/database-request";
import type { DatabaseStatsDto } from "./dto/database-stats.dto";

@Controller("database")
@ApiTags("database")
export class DatabaseController {
  constructor(private databaseService: DatabaseService) {}

  @Get("stats")
  @ApiOperation({ summary: "Get database statistics" })
  @ApiResponse({
    status: 200,
    description: "Statistics retrieved successfully",
  })
  @UseGuards(AuthGuard, RoleGuard)
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN)
  @ApiBearerAuth("access-token")
  async getStats(@Req() request: DatabaseRequest): Promise<DatabaseStatsDto> {
    const stats = await this.databaseService.getStats();

    request.database = stats;

    return stats;
  }

  @Post("clear")
  @ApiOperation({ summary: "Clear all data" })
  @ApiResponse({ status: 200, description: "Data cleared successfully" })
  @UseGuards(AuthGuard, RoleGuard)
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN)
  @ApiBearerAuth("access-token")
  async clearAllData(): Promise<{ message: string }> {
    await this.databaseService.clearAllData();
    return { message: "All data cleared successfully" };
  }

  @Get("health")
  @ApiOperation({ summary: "Check database health status" })
  @ApiResponse({ status: 200, description: "Database health check completed" })
  async checkHealth() {
    const healthCheck = await this.databaseService.isHealthy();

    return {
      status: healthCheck.healthy ? "healthy" : "unhealthy",
      service: "database",
      timestamp: new Date().toISOString(),
      details: {
        connected: healthCheck.healthy,
        latencyMs: healthCheck.latencyMs,
        ...(healthCheck.error !== undefined && { error: healthCheck.error }),
      },
    };
  }
}
