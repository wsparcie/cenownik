import { Role } from "@prisma/client";

import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
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
}
