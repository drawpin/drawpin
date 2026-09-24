import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * What a link to DrawPin looks like when someone pastes it somewhere.
 *
 * The card is a fixed image of the wordmark rather than a drawing from the
 * board: whatever was posted last would otherwise represent the venue
 * everywhere that link travels.
 *
 * `metadataBase` is the live domain rather than an environment variable, so
 * the URL is absolute in every client and a preview deployment advertises the
 * same picture instead of one behind Vercel's login.
 *
 * The image file carries a version in its name because iMessage, WhatsApp and
 * Slack cache a preview against the image URL, for days and with no way to ask
 * them to refetch. Replacing the file in place leaves every link already sent
 * — and every new one — showing the old picture. **Changing the card means
 * renaming the file**, here and in the board's `generateMetadata`.
 */
export const metadata: Metadata = {
  metadataBase: new URL("https://drawpin.io"),
  title: "DrawPin",
  description:
    "Scan a QR code, draw a tile, and vote for the weekly winner at your local spot.",
  openGraph: {
    type: "website",
    siteName: "DrawPin",
    title: "DrawPin",
    description: "Draw It. Pin It. Compete to Win!",
    images: [{ url: "/og-v2.png", width: 1200, height: 630, alt: "DrawPin" }],
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        {/* Both pages have to be reachable from anywhere on the site: Google
            asks for them when publishing the sign-in (issue #63). */}
        <footer className="text-muted-foreground flex justify-center gap-4 px-4 py-6 text-xs">
          <Link href="/privacy" className="underline underline-offset-4">
            Privacy
          </Link>
          <Link href="/terms" className="underline underline-offset-4">
            Terms
          </Link>
        </footer>
      </body>
    </html>
  );
}
