import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Manrope, Cormorant_Garamond } from "next/font/google";

import { StoreProvider } from "@/components/store-provider";
import { Toaster } from "@/components/ui/sonner";
import { storeConfig } from "@/lib/store-config";

import "./globals.css";

// latin-ext é necessário para os acentos do português (ê, ã, õ, ç).
const manrope = Manrope({
  subsets: ["latin", "latin-ext"],
  variable: "--font-manrope",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500"],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${storeConfig.name} — ${storeConfig.tagline}`,
    template: `%s · ${storeConfig.name}`,
  },

  description: storeConfig.description,

  openGraph: {
    title: `${storeConfig.name} — ${storeConfig.tagline}`,
    description: storeConfig.description,
    type: "website",
    locale: "pt_BR",
    siteName: storeConfig.name,
  },

  icons: {
    icon: [
      {
        url: "/icon.png",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/apple-icon.png",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f8e7e6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${manrope.variable} ${cormorant.variable} bg-background`}
    >
      <body className="font-sans antialiased">
        <StoreProvider>{children}</StoreProvider>

        <Toaster position="top-center" />

        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  );
}
