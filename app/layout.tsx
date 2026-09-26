import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ottodot TrialGuard",
  description: "Concurrency-safe trial class booking."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
