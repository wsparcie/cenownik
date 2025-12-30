import { Role } from "@prisma/client";

import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles/role.decorator";
import { RoleGuard } from "../auth/roles/role.guard";
import { ScraperMoreleService } from "./scraper-morele.service";

@ApiTags("scraper")
@Controller("scraper")
export class ScraperMoreleController {
  constructor(private readonly scraperService: ScraperMoreleService) {}

  @Post("run")
  @ApiOperation({ summary: "Manually trigger scraping for all offers" })
  @ApiResponse({ status: 200, description: "Scraping started" })
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth("access-token")
  async scrapeAll(): Promise<{ message: string }> {
    await this.scraperService.scrapeAllOffers();
    return { message: "Scraping completed" };
  }

  @Post("run/:id")
  @ApiOperation({ summary: "Manually trigger scraping for a specific offer" })
  @ApiParam({ name: "id", description: "Offer ID" })
  @ApiResponse({ status: 200, description: "Offer scraped" })
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth("access-token")
  async scrapeOne(
    @Param("id", ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    await this.scraperService.scrapeAndUpdateOffer(id);
    return { message: `Offer ${String(id)} scraped` };
  }

  @Get("test")
  @ApiOperation({ summary: "Test scraping a URL without saving" })
  @ApiQuery({ name: "url", description: "URL to scrape" })
  @ApiResponse({ status: 200, description: "Scraped data returned" })
  async testScrape(
    @Query("url") url: string,
  ): Promise<{ price: number | null; title: string | null; source: string }> {
    return this.scraperService.scrapeUrl(url);
  }

  @Get("config/cron")
  @ApiOperation({ summary: "Get current cron expression for scraping" })
  @ApiResponse({ status: 200, description: "Current cron expression" })
  async getCron(): Promise<{ cron: string }> {
    const cron = await this.scraperService.getCronExpression();
    return { cron };
  }

  @Put("config/cron")
  @ApiOperation({ summary: "Update cron expression for scraping" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        cron: {
          type: "string",
          example: "*/30 * * * *",
          description: "Cron expression (e.g., every 30 min: */30 * * * *)",
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: "Cron expression updated" })
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth("access-token")
  async setCron(
    @Body("cron") cron: string,
  ): Promise<{ message: string; cron: string }> {
    await this.scraperService.setCronExpression(cron);
    return { message: "Cron expression updated", cron };
  }

  @Get("history/:offerId")
  @ApiOperation({ summary: "Get price history for a specific offer" })
  @ApiParam({ name: "offerId", description: "Offer ID" })
  @ApiResponse({ status: 200, description: "Price history returned" })
  async getPriceHistory(@Param("offerId", ParseIntPipe) offerId: number) {
    return this.scraperService.getPriceHistory(offerId);
  }

  @Get("history/targets/reached")
  @ApiOperation({ summary: "Get all instances when target price was reached" })
  @ApiQuery({
    name: "offerId",
    required: false,
    description: "Filter by offer ID",
  })
  @ApiResponse({ status: 200, description: "Target reached history returned" })
  async getTargetReachedHistory(@Query("offerId") offerId?: string) {
    const parsedOfferId =
      offerId !== undefined ? Number.parseInt(offerId, 10) : undefined;
    return this.scraperService.getTargetReachedHistory(parsedOfferId);
  }
}
