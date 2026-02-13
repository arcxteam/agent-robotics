import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://arcspatial.portaltestnet.com"),
  title: {
    default: "ARC SPATIAL - Transform Blueprint to Autonomous Execution",
    template: "%s | ARC SPATIAL"
  },
  description: "Empower your facility to perform autonomous material transport, optimize workflows, and enhance productivity with our intelligent robot fleet management system. AI-powered robotics platform for construction automation, digital twin simulation, and real-time fleet monitoring. From planning to measurable results.",
  keywords: [
    "ARC SPATIAL",
    "Robotics Platform",
    "AI-driven Robotics",
    "Autonomous Robotics Control",
    "Intelligent Robot Fleet",
    "Construction Automation",
    "Material Transport",
    "Digital Twin",
    "Fleet Management",
    "Robot Simulation",
    "Pick and Place",
    "Warehouse Automation",
    "Industrial Robotics",
    "AI Optimization",
    "Real-time Monitoring",
    "Task Scheduling"
  ],
  authors: [{ name: "ARC SPATIAL Team", url: "https://arcspatial.portaltestnet.com" }],
  creator: "ARC SPATIAL",
  publisher: "ARC SPATIAL",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/arc-spatial-cyan.png",
    shortcut: "/arc-spatial-cyan.png",
    apple: "/arc-spatial-cyan.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://arcspatial.portaltestnet.com",
    siteName: "ARC SPATIAL",
    title: "ARC SPATIAL - Transform Blueprint to Autonomous Execution",
    description: "AI-powered robotics platform for construction automation and material transport. Autonomous robot fleet management with digital twin simulation, real-time monitoring, and intelligent task scheduling.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ARC SPATIAL - Autonomous Robotics Control Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@gr3yscope",
    creator: "@gr3yscope",
    title: "ARC SPATIAL - Transform Blueprint to Autonomous Execution",
    description: "AI-powered robotics platform for construction automation and material transport. Autonomous robot fleet management with digital twin simulation.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://arcspatial.portaltestnet.com",
  },
  category: "Technology",
  verification: {
    google: "your-google-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased dark bg-[#0a0a12] text-foreground min-h-screen`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
