import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Genix Pet — Sistema de gestão para pet shops",
  description: "O sistema completo para gerenciar seu pet shop: agenda, financeiro, clientes, catálogo digital e muito mais.",
  icons: {
    icon: "https://tufsjmcgvlbrqltagklr.supabase.co/storage/v1/object/public/site-assets/ChatGPT%20Image%208%20de%20ago.%20de%202026,%2010_17_27.png",
  },
  openGraph: {
    title: "Genix Pet — Sistema de gestão para pet shops",
    description: "O sistema completo para gerenciar seu pet shop: agenda, financeiro, clientes, catálogo digital e muito mais.",
    url: "https://www.genixpet.com.br",
    siteName: "Genix Pet",
    images: [
      {
        url: "https://tufsjmcgvlbrqltagklr.supabase.co/storage/v1/object/public/site-assets/ChatGPT%20Image%208%20de%20ago.%20de%202026,%2010_17_27.png",
        width: 1200,
        height: 630,
      },
    ],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Genix Pet — Sistema de gestão para pet shops",
    description: "O sistema completo para gerenciar seu pet shop: agenda, financeiro, clientes, catálogo digital e muito mais.",
    images: ["https://tufsjmcgvlbrqltagklr.supabase.co/storage/v1/object/public/site-assets/ChatGPT%20Image%208%20de%20ago.%20de%202026,%2010_17_27.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
