import type { Browser } from "playwright";
import { chromium } from "playwright";

import { Injectable, Logger } from "@nestjs/common";

import type { PriceScraper, ScrapedPrice } from "./scraper.interface";

@Injectable()
export class XkomScraper implements PriceScraper {
  private readonly logger = new Logger(XkomScraper.name);

  canHandle(url: string): boolean {
    return url.includes("x-kom.pl");
  }

  async scrape(url: string): Promise<ScrapedPrice> {
    let browser: Browser | null = null;

    try {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        locale: "pl-PL",
      });

      const page = await context.newPage();

      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      });

      await page
        .waitForSelector('meta[property="product:price:amount"]', {
          timeout: 10_000,
        })
        .catch(() => null);

      const priceContent = await page
        .locator('meta[property="product:price:amount"]')
        .getAttribute("content");

      let price: number | null = null;
      if (priceContent !== null) {
        const numericPrice = Number.parseFloat(priceContent.replace(",", "."));
        if (!Number.isNaN(numericPrice)) {
          price = numericPrice;
        }
      }

      const titleContent = await page
        .locator('meta[property="og:title"]')
        .getAttribute("content");
      const title = titleContent ?? null;

      this.logger.debug(
        `Scraped x-kom.pl: price=${String(price)}, title=${String(title)}`,
      );

      return { price, title, source: "xkom" };
    } catch (error) {
      this.logger.error(
        `Failed to scrape x-kom.pl ${url}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return { price: null, title: null, source: "xkom" };
    } finally {
      if (browser !== null) {
        await browser.close();
      }
    }
  }
}
