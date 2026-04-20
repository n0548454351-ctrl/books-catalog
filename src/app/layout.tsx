import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s | ספרים אקדמיים",
    default: "ספרים אקדמיים — אוסף ספרים אקדמיים נדירים",
  },
  description:
    "אוסף ייחודי של ספרים אקדמיים נדירים מעזבונו של חוקר גדול. פילוסופיה, מדעי היהדות, היסטוריה ועוד. משלוח לכל העולם.",
  openGraph: {
    siteName: "ספרים אקדמיים",
    locale: "he_IL",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen bg-parchment-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
