import type { Metadata } from "next";
import { Comfortaa, Geist_Mono } from "next/font/google";
import "../styles/globals.css";

const comfortaa = Comfortaa({
  variable: "--font-comfortaa",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Weft: Networking that actually connects",
  description:
    "Weft is AI matchmaking for professional events. We match attendees on their goals, expertise, and values, not just job titles or small talk, then put the right small groups in a room together.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${comfortaa.variable} ${geistMono.variable} antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
