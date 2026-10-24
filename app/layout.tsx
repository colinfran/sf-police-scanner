import type { Metadata, Viewport } from "next";
import { Analytics } from '@vercel/analytics/next';
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { FranceschiniAnalytics } from '@colinfran/analytics'

import "./globals.css";

const title = "SF Police Scanner – Live San Francisco Police Calls";
const description =
  "Track San Francisco police dispatch calls in real time. Browse live and past calls for service by date, priority, neighborhood and district, on a list or map.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: title,
    template: `%s | ${SITE_NAME}`,
  },
  description,
  applicationName: SITE_NAME,
  keywords: [
    "SF police scanner",
    "San Francisco police scanner",
    "San Francisco police calls",
    "SFPD dispatch",
    "SF 911 calls",
    "calls for service",
    "San Francisco crime map",
    "live police activity",
  ],
  category: "news",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title,
    description,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" },
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        {children}
        <Analytics />
        <FranceschiniAnalytics websiteId="web_pOSdvAMxO33VMEjA92uF" />
      </body>
    </html>
  );
}
