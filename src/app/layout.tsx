import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_ORG_NAME,
  description: `A professional meetup organization based in ${process.env.NEXT_PUBLIC_ORG_LOCATION}, bringing together systems administrators, DevOps engineers, and technology professionals.`,
  keywords: [process.env.NEXT_PUBLIC_ORG_NAME || "ETSA", process.env.NEXT_PUBLIC_ORG_NAME || "East Tennessee Systems Administration", "Systems Administration", "DevOps", process.env.NEXT_PUBLIC_ORG_LOCATION || "Knoxville", "Meetup", "Technology"],
  authors: [{ name: process.env.NEXT_PUBLIC_ORG_NAME }],
  creator: process.env.NEXT_PUBLIC_ORG_NAME,
  publisher: process.env.NEXT_PUBLIC_ORG_NAME,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_WEBSITE_URL,
    title: process.env.NEXT_PUBLIC_ORG_NAME,
    description: `A professional meetup organization based in ${process.env.NEXT_PUBLIC_ORG_LOCATION}, bringing together systems administrators, DevOps engineers, and technology professionals.`,
    siteName: process.env.NEXT_PUBLIC_ORG_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: "ETSA",
    description: "A professional meetup organization based in Knoxville, TN, bringing together systems administrators, DevOps engineers, and technology professionals.",
  },
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={`${inter.variable} font-sans antialiased bg-white dark:bg-etsa-dark text-gray-900 dark:text-gray-100`}
        suppressHydrationWarning
      >
        <ThemeProvider defaultTheme="system" storageKey="etsa-ui-theme">
          <div className="relative flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
