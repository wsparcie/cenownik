import * as cheerio from "cheerio";
import { CronJob } from "cron";

import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";

import { DatabaseService } from "../database/database.service";

const SCRAPE_CRON_JOB = "scrape-cron-job";
const DEFAULT_CRON = "0 * * * *";

interface ScrapedPrice {
  price: number | null;
  title: string | null;
  source: string;
}

@Injectable()
export class ScraperMoreleService implements OnModuleInit {
  private readonly logger = new Logger(ScraperMoreleService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  async onModuleInit(): Promise<void> {
    const cronExpression = await this.getCronExpression();
    this.addCronJob(cronExpression);
    this.logger.log(`Scraper initialized with cron: ${cronExpression}`);
  }

  async getCronExpression(): Promise<string> {
    const config = await this.databaseService.config.findUnique({
      where: { key: "SCRAPE_CRON" },
    });
    return config?.value ?? process.env["SCRAPE_CRON"] ?? DEFAULT_CRON;
  }

  async setCronExpression(cronExpression: string): Promise<void> {
    await this.databaseService.config.upsert({
      where: { key: "SCRAPE_CRON" },
      update: { value: cronExpression },
      create: { key: "SCRAPE_CRON", value: cronExpression },
    });

    this.removeCronJob();
    this.addCronJob(cronExpression);
    this.logger.log(`Cron updated to: ${cronExpression}`);
  }

  private addCronJob(cronExpression: string): void {
    const job = new CronJob(cronExpression, () => {
      void this.handleScheduledScraping();
    });

    this.schedulerRegistry.addCronJob(SCRAPE_CRON_JOB, job);
    job.start();
  }

  private removeCronJob(): void {
    if (this.schedulerRegistry.doesExist("cron", SCRAPE_CRON_JOB)) {
      this.schedulerRegistry.deleteCronJob(SCRAPE_CRON_JOB);
    }
  }

  private async fetchHtml(url: string): Promise<string> {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });

    if (!response.ok) {
      throw new Error(
        `HTTP ${String(response.status)}: ${response.statusText}`,
      );
    }

    return response.text();
  }

  async scrapeMorele(url: string): Promise<ScrapedPrice> {
    try {
      const html = await this.fetchHtml(url);
      const $ = cheerio.load(html);

      const priceAttribute = $(".product-price[data-price]").attr("data-price");
      let price: number | null = null;

      if (priceAttribute !== undefined) {
        price = Number.parseFloat(priceAttribute);
      }

      const title = $("h1.prod-name").text().trim() || null;

      this.logger.debug(
        `Scraped morele.net: price=${String(price)}, title=${String(title)}`,
      );

      return { price, title, source: "morele" };
    } catch (error) {
      this.logger.error(
        `Failed to scrape morele.net ${url}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return { price: null, title: null, source: "morele" };
    }
  }

  async scrapeUrl(url: string): Promise<ScrapedPrice> {
    if (url.includes("morele.net")) {
      return this.scrapeMorele(url);
    }

    this.logger.warn(`Unsupported store: ${url}`);
    return { price: null, title: null, source: "unknown" };
  }

  async scrapeAndUpdateOffer(offerId: number): Promise<void> {
    const offer = await this.databaseService.offer.findUnique({
      where: { id: offerId },
    });

    if (offer === null) {
      this.logger.warn(`Offer ${String(offerId)} not found`);
      return;
    }

    const scraped = await this.scrapeUrl(offer.link);

    if (scraped.price !== null) {
      const previousPrice = Number(offer.price);
      const newPrice = scraped.price;
      const priceChanged = previousPrice !== newPrice;

      const targetPrice =
        offer.targetPrice !== null ? Number(offer.targetPrice) : null;
      const targetPriceReached =
        targetPrice !== null && newPrice <= targetPrice;

      if (priceChanged) {
        await this.databaseService.priceHistory.create({
          data: {
            offerId: offerId,
            price: newPrice,
            previousPrice: previousPrice,
            targetPriceReached: targetPriceReached,
            targetPriceAtTime: offer.targetPrice,
          },
        });

        if (targetPriceReached) {
          this.logger.log(
            `TARGET REACHED for offer ${String(offerId)}: ${String(newPrice)} PLN <= ${String(targetPrice)} PLN`,
          );
        }
      }

      await this.databaseService.offer.update({
        where: { id: offerId },
        data: {
          price: newPrice,
          title: scraped.title ?? offer.title,
          source: scraped.source,
        },
      });

      this.logger.log(
        `Updated offer ${String(offerId)}: ${String(scraped.title)} - ${String(newPrice)} PLN${priceChanged ? ` (was ${String(previousPrice)} PLN)` : ""}`,
      );
    }
  }

  async scrapeAllOffers(): Promise<void> {
    const offers = await this.databaseService.offer.findMany({
      select: { id: true, link: true },
    });

    this.logger.log(`Scraping ${String(offers.length)} offers...`);

    for (const offer of offers) {
      await this.scrapeAndUpdateOffer(offer.id);
      await this.delay(2000);
    }

    this.logger.log("Finished scraping all offers");
  }

  async handleScheduledScraping(): Promise<void> {
    this.logger.log("Starting scheduled price scraping...");
    await this.scrapeAllOffers();
  }

  async getPriceHistory(offerId: number) {
    return this.databaseService.priceHistory.findMany({
      where: { offerId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getTargetReachedHistory(offerId?: number) {
    return this.databaseService.priceHistory.findMany({
      where: {
        targetPriceReached: true,
        ...(offerId !== undefined ? { offerId } : {}),
      },
      include: {
        offer: {
          select: { id: true, title: true, link: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
