import * as cheerio from "cheerio";

import { Injectable, Logger } from "@nestjs/common";

import type { PriceScraper, ScrapedPrice } from "./scraper.interface";

@Injectable()
export class MoreleScraper implements PriceScraper {
  private readonly logger = new Logger(MoreleScraper.name);

  canHandle(url: string): boolean {
    return url.includes("morele.net");
  }

  async scrape(url: string): Promise<ScrapedPrice> {
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
}
