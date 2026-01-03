export interface ScrapedPrice {
  price: number | null;
  title: string | null;
  source: string;
}

export interface PriceScraper {
  canHandle: (url: string) => boolean;
  scrape: (url: string) => Promise<ScrapedPrice>;
}
