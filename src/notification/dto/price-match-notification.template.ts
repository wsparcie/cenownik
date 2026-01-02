export interface PriceMatchNotificationData {
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

const formatPrice = (price: number): string =>
  price.toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getSourceDisplayName = (source: string): string => {
  const sources: Record<string, string> = {
    morele: "MORELE.NET",
    "morele.net": "MORELE.NET",
    "x-kom": "X-KOM",
    xkom: "X-KOM",
  };
  return sources[source.toLowerCase().trim()] ?? source.toUpperCase();
};

export function generatePriceMatchNotificationTemplate(
  data: PriceMatchNotificationData,
): { subject: string; html: string } {
  const { userName, offer, priceDropPercentage, savingsAmount } = data;
  const sourceName = getSourceDisplayName(offer.source);

  const subject = `CENOWNIK — ${offer.title} — ${formatPrice(offer.currentPrice)} zł`;

  const imageSection =
    offer.images.length > 0
      ? `
        <div style="padding: 60px 40px; background: linear-gradient(145deg, #ffffff, #e6e6e6); text-align: center; position: relative;">
          <div style="position: absolute; top: 0; left: 0; right: 0; height: 40px; background: linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, transparent 100%);"></div>
          <img 
            src="${offer.images[0]}" 
            alt="${offer.title}"
            style="max-width: 80%; max-height: 300px; object-fit: contain; box-shadow: 0 10px 25px rgba(0,0,0,0.15), 0 40px 60px rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.8);"
          />
          <div style="position: absolute; bottom: 20px; left: 20px; font-size: 11px; color: #aaa; letter-spacing: 2px; padding: 10px; background: rgba(255,255,255,0.7); border-radius: 2px;">
            ${sourceName}<br/>
            #${String(offer.id)}<br/>
            ${String(new Date().getFullYear())}
          </div>
        </div>
      `
      : `
        <div style="padding: 60px 40px; background: linear-gradient(145deg, #ffffff, #e6e6e6); text-align: center;">
          <div style="font-size: 11px; color: #aaa; letter-spacing: 2px;">
            ${sourceName} • #${String(offer.id)}
          </div>
        </div>
      `;

  const priceDisplay =
    offer.previousPrice === null
      ? `
        <span style="color: #333; font-size: 24px; font-weight: 300; letter-spacing: 1px;">${formatPrice(offer.currentPrice)} zł</span>
      `
      : `
        <span style="color: #aaa; text-decoration: line-through; font-size: 14px; margin-right: 12px;">${formatPrice(offer.previousPrice)} zł</span>
        <span style="color: #333; font-size: 24px; font-weight: 300; letter-spacing: 1px;">${formatPrice(offer.currentPrice)} zł</span>
        ${priceDropPercentage > 0 ? `<span style="color: #888; font-size: 12px; margin-left: 8px;">−${priceDropPercentage.toFixed(0)}%</span>` : ""}
      `;

  const html = `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cenownik — Cena spadła</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f8f8f8; color: #333;">
  
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background: #fff; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
          
          <!-- Product Display -->
          <tr>
            <td>
              ${imageSection}
            </td>
          </tr>
          
          <!-- Product Info -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 16px; font-size: 16px; font-weight: 400; color: #333; line-height: 1.5;">
                ${offer.title}
              </p>
              <div style="margin-bottom: 20px;">
                ${priceDisplay}
              </div>
              <p style="margin: 0 0 8px; font-size: 12px; color: #888; letter-spacing: 1px;">
                TWÓJ PRÓG: ${formatPrice(offer.targetPrice)} zł
                ${savingsAmount > 0 ? `<span style="margin-left: 16px;">OSZCZĘDZASZ: ${formatPrice(savingsAmount)} zł</span>` : ""}
              </p>
            </td>
          </tr>
          
          <!-- CTA -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <a href="${offer.link}" target="_blank" style="display: inline-block; background: #333; color: #fff; text-decoration: none; font-size: 12px; font-weight: 400; padding: 14px 28px; letter-spacing: 2px; text-transform: uppercase;">
                Zobacz ofertę →
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background: #fff; border-top: 1px solid #e0e0e0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size: 11px; color: #888; letter-spacing: 1px;">
                    <strong style="color: #333;">CENOWNIK</strong>
                  </td>
                  <td style="text-align: right; font-size: 11px; color: #888; letter-spacing: 1px;">
                    ${userName.toUpperCase()}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
  
</body>
</html>`;

  return { subject, html };
}

export function generatePriceMatchNotificationPlainText(
  data: PriceMatchNotificationData,
): string {
  const { userName, offer, priceDropPercentage, savingsAmount } = data;
  const sourceName = getSourceDisplayName(offer.source);

  return `
CENOWNIK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${offer.title}

${formatPrice(offer.currentPrice)} zł${offer.previousPrice === null ? "" : ` (było: ${formatPrice(offer.previousPrice)} zł)`}${priceDropPercentage > 0 ? ` −${priceDropPercentage.toFixed(0)}%` : ""}

Twój próg: ${formatPrice(offer.targetPrice)} zł${
    savingsAmount > 0
      ? `
Oszczędzasz: ${formatPrice(savingsAmount)} zł`
      : ""
  }

${sourceName} • #${String(offer.id)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${offer.link}

${userName}
`.trim();
}
