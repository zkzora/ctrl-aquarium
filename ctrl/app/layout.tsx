import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CTRL — One world. Too many hands.",
  description: "A shared aquarium. Sixty seconds at the keyboard. Leave the world a little stranger than you found it. Shared credit demo.",
  icons: {
    icon: "/assets/brand/ctrl-favicon.svg",
    shortcut: "/assets/brand/ctrl-favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
