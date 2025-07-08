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
  title: "ETSA",
  description: "A professional meetup organization based in Knoxville, TN, bringing together systems administrators, DevOps engineers, and technology professionals.",
  keywords: ["ETSA", "East Tennessee", "Systems Administration", "DevOps", "Knoxville", "Meetup", "Technology"],
  authors: [{ name: "ETSA" }],
  creator: "ETSA",
  publisher: "ETSA",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://etsa.tech",
    title: "ETSA",
    description: "A professional meetup organization based in Knoxville, TN, bringing together systems administrators, DevOps engineers, and technology professionals.",
    siteName: "ETSA",
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
        className={`${inter.variable} font-sans antialiased bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100`}
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
