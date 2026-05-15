import type { Metadata } from "next";
import {
  Bitter,
  DM_Mono,
  DM_Sans,
  Lora,
  Playfair_Display,
  Source_Serif_4,
} from "next/font/google";

import { Provider } from "jotai";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { Toaster } from "@/components/ui/sonner";
import { TRPCReactProvider } from "@/trpc/client";

import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "700"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "700", "900"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const bitter = Bitter({
  variable: "--font-bitter",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Floodrix | Advanced Water Resources & Civil Engineering",
    template: "%s | Floodrix",
  },
  description:
    "Floodrix specializes in climate-resilient hydrology, hydrodynamic flood modeling, and sustainable water infrastructure. Delivering data-driven engineering solutions for highway drainage, groundwater mitigation, and irrigation automation.",
  keywords: [
    "Flood Modeling",
    "Hydrology",
    "Civil Engineering",
    "Water Resources",
    "Highway Drainage",
    "Groundwater Mitigation",
    "Irrigation Automation",
    "Climate Resilience",
    "HEC-RAS",
    "SWMM",
  ],
  authors: [{ name: "Jaidev Singh Rathore" }],
  creator: "Floodrix",
  publisher: "Floodrix Engineering",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://floodrix.com",
    siteName: "Floodrix",
    title: "Floodrix | Advanced Water Resources Engineering",
    description:
      "Expert hydrological modeling and climate-adaptive water infrastructure solutions.",
    images: [
      {
        url: "/icon.png",
        width: 1200,
        height: 630,
        alt: "Floodrix Engineering",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Floodrix | Advanced Water Resources Engineering",
    description:
      "Expert hydrological modeling and climate-adaptive water infrastructure solutions.",
    images: ["/icon.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${dmMono.variable} ${playfair.variable} ${lora.variable} ${sourceSerif.variable} ${bitter.variable}`}
      suppressHydrationWarning
    >
      <head></head>
      <body className="antialiased">
        <TRPCReactProvider>
          <NuqsAdapter>
            <Provider>
              {children}
              <Toaster />
            </Provider>
          </NuqsAdapter>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
