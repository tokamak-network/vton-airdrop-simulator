import type { Metadata } from "next";
import { DM_Sans, Source_Code_Pro } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const dmSans = DM_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const sourceCodePro = Source_Code_Pro({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Airdrop Simulator",
  description:
    "Simulate and configure airdrop distribution criteria for Tokamak Network",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${sourceCodePro.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
