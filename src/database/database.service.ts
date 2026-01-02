import { PrismaClient } from "@prisma/client";

import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

import type { DatabaseStatsDto } from "./dto/database-stats.dto";

@Injectable()
export class DatabaseService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async getStats(): Promise<DatabaseStatsDto> {
    const [users, offers] = await Promise.all([
      this.user.count(),
      this.offer.count(),
    ]);

    return {
      users,
      offers,
      timestamp: new Date(),
    };
  }

  async getAllOffers() {
    return this.offer.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }
  async clearAllData(): Promise<void> {
    await this.offer.deleteMany();
    await this.user.deleteMany();
  }

  async isHealthy(): Promise<{
    healthy: boolean;
    latencyMs: number;
    error?: string;
  }> {
    const start = Date.now();
    try {
      await this.$queryRaw`SELECT 1`;
      return {
        healthy: true,
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
