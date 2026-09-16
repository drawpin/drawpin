import QRCode from "qrcode";

/**
 * Builds the public URL of a venue's board — the address the printed QR code
 * opens.
 *
 * @param siteUrl - The deployed site's origin, e.g. `https://drawpin.app`.
 * @param slug - The venue's board slug.
 */
export function boardUrl(siteUrl: string, slug: string): string {
  return new URL(`/b/${encodeURIComponent(slug)}`, siteUrl).toString();
}

/**
 * Renders a board URL as a QR code in two forms: SVG to show on screen, and a
 * high-resolution PNG data URL for the owner to download and print.
 */
export async function createBoardQrCode(
  url: string,
): Promise<{ svg: string; pngDataUrl: string }> {
  // "M" error correction survives smudges and small stickers on a printed
  // code without making it dense enough to be hard to scan from a phone.
  const options = { errorCorrectionLevel: "M", margin: 2 } as const;

  const [svg, pngDataUrl] = await Promise.all([
    QRCode.toString(url, { ...options, type: "svg" }),
    QRCode.toDataURL(url, { ...options, width: 1024 }),
  ]);

  return { svg, pngDataUrl };
}
