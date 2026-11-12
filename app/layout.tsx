import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "wall",
  description: "A friendly place to leave a note.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
