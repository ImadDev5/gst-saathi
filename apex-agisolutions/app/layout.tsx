import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.apexagisolutions.com"),
  title:
    "Solutions | Elite Outsourcing from India to US, UK, Canada, Australia & Middle East | Healthcare BPO, Tech Staffing & AI Services",
  description:
    "Transform your business with India's top 1% talent. Apex AGI Solutions delivers premium outsourcing services in Healthcare BPO, Tech Staffing, Sales, Finance & AI Consulting.",
  keywords: [
    "Outsourcing India to US",
    "Outsourcing India to UK",
    "Healthcare BPO Hyderabad",
    "Tech Staffing India",
    "AI Consulting Services",
    "Remote Teams India",
    "Medical Billing Outsourcing",
    "Sales Development Outsourcing",
    "Finance Outsourcing India",
    "Canadian Outsourcing Services",
    "Australian BPO Services",
    "Middle East Outsourcing",
    "HIPAA Compliant BPO",
    "ISO 27001 Certified",
    "Cost-effective Outsourcing",
  ],
  authors: [{ name: "Apex AGI Solutions" }],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    title: "Apex AGI Solutions | Elite Global Outsourcing from India",
    description:
      "Connect with top 1% Indian talent for Healthcare BPO, Tech Staffing, AI Services. Serving US, UK, Canada, Australia & Middle East. Save 60% costs.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Apex AGI Solutions | Elite Global Outsourcing from India",
    description:
      "Connect with top 1% Indian talent for Healthcare BPO, Tech Staffing, AI Services. Serving US, UK, Canada, Australia & Middle East. Save 60% costs.",
  },
  robots: {
    index: true,
    follow: true,
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
      className={`${inter.variable} ${jetBrainsMono.variable} scroll-smooth`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body className="min-h-full bg-background text-foreground antialiased">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}