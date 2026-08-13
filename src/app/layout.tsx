import type { Metadata } from "next";
import "../styles/globals.css";

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
      className="antialiased"
    >
      <body>{children}</body>
    </html>
  );
}
