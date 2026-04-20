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

export function getBookCoverUrl(book: { images?: { is_cover: boolean; image_url: string }[] }): string {
  const cover = book.images?.find((i) => i.is_cover);
  return cover?.image_url ?? "/placeholder-book.svg";
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
