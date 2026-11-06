import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Madaraka Express | Travel Kenya by Rail",
  description:
    "Discover a more comfortable way to travel between Nairobi and Mombasa with Madaraka Express.",
  openGraph: {
    title: "Madaraka Express | Travel Kenya by Rail",
    description: "Comfortable rail journeys from Nairobi to Mombasa.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
