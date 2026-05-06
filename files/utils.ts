import type { Book } from "@/types";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .slice(0, 100);
}

/**
 * מחזיר URL תקין לכריכת ספר.
 * תומך ב:
 * - קישורי Google Drive (ממיר ל-thumbnail API)
 * - URL רגיל (מחזיר כמות שהוא)
 * - ללא תמונה (מחזיר placeholder)
 */
export function getBookCoverUrl(book: any): string {
  const fallback = "/placeholder-book.png";

  const raw =
    book?.images?.find((img: any) => img.is_cover)?.image_url ||
    book?.images?.[0]?.image_url ||
    null;

  if (!raw) return fallback;

  return convertImageUrl(raw);
}

/**
 * ממיר כל URL תמונה לכתובת תקינה להצגה.
 * ניתן לקרוא גם עצמאית.
 */
export function convertImageUrl(raw: string): string {
  const fallback = "/placeholder-book.png";

  if (!raw || typeof raw !== "string") return fallback;

  // Google Drive — חילוץ fileId ושימוש ב-thumbnail API
  const fileId =
    raw.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] ||
    raw.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1] ||
    raw.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];

  if (fileId) {
    // sz=w600 מאזן בין איכות לביצועים
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w600`;
  }

  // URL רגיל — מחזיר כמות שהוא
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  // נתיב יחסי (כגון /uploads/...)
  if (raw.startsWith("/")) {
    return raw;
  }

  return fallback;
}

export function formatPrice(price?: number | null): string {
  if (!price) return "";
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    minimumFractionDigits: 0,
  }).format(price);
}

export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max).trimEnd() + "…";
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function stockLabel(book: Book): { text: string; cls: string } {
  const inv = book.inventory;
  if (!inv || !inv.in_stock) return { text: "אזל", cls: "badge-out-stock" };
  if (inv.quantity <= 2)      return { text: "מעט נשאר", cls: "badge-low-stock" };
  return { text: "במלאי", cls: "badge-in-stock" };
}
