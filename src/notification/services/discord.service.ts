import { Injectable, Logger } from "@nestjs/common";

export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  timestamp?: string;
  footer?: {
    text: string;
    icon_url?: string;
  };
  thumbnail?: {
    url: string;
  };
  image?: {
    url: string;
  };
  author?: {
    name: string;
    url?: string;
    icon_url?: string;
  };
  fields?: {
    name: string;
    value: string;
    inline?: boolean;
  }[];
}

export interface DiscordWebhookPayload {
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds?: DiscordEmbed[];
}

export interface PriceMatchDiscordData {
  userName: string;
  offer: {
    id: number;
    title: string;
    link: string;
    currentPrice: number;
    targetPrice: number;
    previousPrice: number | null;
    source: string;
    description: string | null;
    images: string[];
    createdAt: Date;
    updatedAt: Date;
  };
  priceDropPercentage: number;
  savingsAmount: number;
}

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);

  private readonly COLORS = {
    SUCCESS: 0x10_b9_81,
    INFO: 0x3b_82_f6,
    WARNING: 0xf5_9e_0b,
    ERROR: 0xef_44_44,
  };

  private readonly SOURCE_COLORS: Record<string, number> = {
    morele: 0x00_a8_59,
    "morele.net": 0x00_a8_59,
    "x-kom": 0x1a_1a_1a,
    xkom: 0x1a_1a_1a,
  };

  private readonly SOURCE_NAMES: Record<string, string> = {
    morele: "Morele.net",
    "morele.net": "Morele.net",
    "x-kom": "x-kom",
    xkom: "x-kom",
  };

  async sendWebhookMessage(
    webhookUrl: string,
    payload: DiscordWebhookPayload,
    retries = 3,
  ): Promise<boolean> {
    if (!this.isValidWebhookUrl(webhookUrl)) {
      this.logger.error("Invalid Discord webhook URL format");
      return false;
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: "Cenownik",
            avatar_url: "https://cdn.discordapp.com/embed/avatars/0.png",
            ...payload,
          }),
        });

        if (response.ok || response.status === 204) {
          this.logger.log(
            `Discord webhook message sent successfully (attempt ${String(attempt)})`,
          );
          return true;
        }

        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After");
          const waitTime =
            retryAfter !== null && retryAfter !== ""
              ? Number.parseInt(retryAfter, 10) * 1000
              : 5000;
          this.logger.warn(
            `Discord rate limited, waiting ${String(waitTime)}ms before retry`,
          );
          await this.delay(waitTime);
          continue;
        }

        const errorText = await response.text();
        this.logger.error(
          `Discord webhook failed (attempt ${String(attempt)}/${String(retries)}): ${String(response.status)} - ${errorText}`,
        );

        if (attempt < retries) {
          const delay = 2 ** (attempt - 1) * 1000;
          await this.delay(delay);
        }
      } catch (error) {
        this.logger.error(
          `Discord webhook error (attempt ${String(attempt)}/${String(retries)}):`,
          error instanceof Error ? error.message : String(error),
        );

        if (attempt < retries) {
          const delay = 2 ** (attempt - 1) * 1000;
          await this.delay(delay);
        }
      }
    }

    this.logger.error("Discord webhook failed after all retries");
    return false;
  }

  async sendPriceMatchNotification(
    webhookUrl: string,
    data: PriceMatchDiscordData,
  ): Promise<boolean> {
    const payload = this.generatePriceMatchPayload(data);
    return this.sendWebhookMessage(webhookUrl, payload);
  }

  generatePriceMatchPayload(
    data: PriceMatchDiscordData,
  ): DiscordWebhookPayload {
    const { userName, offer, priceDropPercentage, savingsAmount } = data;

    const sourceName = this.getSourceDisplayName(offer.source).toUpperCase();

    let priceLine = `**${this.formatPrice(offer.currentPrice)} zł**`;
    if (offer.previousPrice !== null) {
      priceLine = `~~${this.formatPrice(offer.previousPrice)} zł~~ → **${this.formatPrice(offer.currentPrice)} zł**`;
    }
    if (priceDropPercentage > 0) {
      priceLine += ` *(−${priceDropPercentage.toFixed(0)}%)*`;
    }

    const descLines: string[] = [
      priceLine,
      "",
      `Twój próg: ${this.formatPrice(offer.targetPrice)} zł`,
    ];

    if (savingsAmount > 0) {
      descLines.push(`Oszczędzasz: ${this.formatPrice(savingsAmount)} zł`);
    }

    const embed: DiscordEmbed = {
      author: {
        name: "CENOWNIK",
      },
      title: offer.title,
      url: offer.link,
      color: 0x33_33_33,
      description: descLines.join("\n"),
      footer: {
        text: `${sourceName} • #${String(offer.id)} • ${userName.toUpperCase()}`,
      },
    };

    if (offer.images.length > 0) {
      embed.image = {
        url: offer.images[0],
      };
    }

    return {
      embeds: [embed],
    };
  }

  async validateWebhook(webhookUrl: string): Promise<boolean> {
    if (!this.isValidWebhookUrl(webhookUrl)) {
      return false;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: "GET",
      });

      if (response.ok) {
        const data = (await response.json()) as { id?: string; name?: string };
        this.logger.log(`Webhook validated: ${data.name ?? "Unknown"}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(
        "Webhook validation failed:",
        error instanceof Error ? error.message : String(error),
      );
      return false;
    }
  }

  isValidWebhookUrl(url: string): boolean {
    const webhookPattern =
      /^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w-]+$/;
    const discordappPattern =
      /^https:\/\/discordapp\.com\/api\/webhooks\/\d+\/[\w-]+$/;

    return webhookPattern.test(url) || discordappPattern.test(url);
  }

  private getSourceDisplayName(source: string): string {
    const normalized = source.toLowerCase().trim();
    return this.SOURCE_NAMES[normalized] ?? source;
  }

  private getSourceColor(source: string): number {
    const normalized = source.toLowerCase().trim();
    return this.SOURCE_COLORS[normalized] ?? this.COLORS.SUCCESS;
  }

  private formatPrice(price: number): string {
    return price.toLocaleString("pl-PL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return `${text.slice(0, maxLength - 3)}...`;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
