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

export function getBookCoverUrl(book: any): string {
  const fallback = "/placeholder-book.png";

  const raw =
    book?.images?.find((img: any) => img.is_cover)?.image_url ||
    book?.images?.[0]?.image_url ||
    fallback;

  if (!raw || raw === fallback) return fallback;

  const fileId =
    raw.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] ||
    raw.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1] ||
    raw.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];

  if (fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  }

  return raw;
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
