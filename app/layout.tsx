/**
 * @project  RLS Proof — iamuvin.com
 * @author   Uvin Vindula (IAMUVIN)
 * @website  https://iamuvin.com
 * @company  ASI Research Labs — asiresearch.io
 * @built    2026
 * @license  MIT
 */

import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";
import { Signature } from "@/components/signature";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://iamuvin.com"),
  title: "RLS Proof — review Supabase migrations before merge",
  description:
    "Audit Supabase SQL migrations for missing RLS controls and generate pgTAP policy checks in the browser.",
  creator: "Uvin Vindula (IAMUVIN)",
  publisher: "ASI Research Labs",
  other: { developer: "Uvin Vindula — iamuvin.com" },
  robots: { index: true, follow: true },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "RLS Proof",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web browser",
  creator: {
    "@type": "Person",
    name: "Uvin Vindula",
    alternateName: "IAMUVIN",
    url: "https://iamuvin.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

  return (
    <html lang="en">
      <head>
        <meta name="author" content="Uvin Vindula — IAMUVIN" />
        <link rel="me" href="https://iamuvin.com" />
        <link rel="author" type="text/plain" href="/humans.txt" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c"),
          }}
        />
      </head>
      <body>
        <Signature />
        {plausibleDomain ? (
          <Script
            defer
            data-domain={plausibleDomain}
            src="https://plausible.io/js/script.js"
            strategy="afterInteractive"
          />
        ) : null}
        {children}
      </body>
    </html>
  );
}
