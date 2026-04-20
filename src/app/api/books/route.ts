import { NextRequest, NextResponse } from "next/server";
import { getPublishedBooks } from "@/lib/db/books";
import type { BookFilters } from "@/types";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const filters: BookFilters = {
    search:   sp.get("search")   ?? undefined,
    category: sp.get("category") ?? undefined,
    language: sp.get("language") ?? undefined,
    in_stock: sp.get("in_stock") === "true" ? true : undefined,
    sort:     (sp.get("sort") as BookFilters["sort"]) ?? "created_at",
    order:    (sp.get("order") as "asc" | "desc") ?? "desc",
    page:     sp.get("page") ? Number(sp.get("page")) : 1,
    limit:    sp.get("limit") ? Math.min(Number(sp.get("limit")), 100) : 24,
  };

  try {
    const result = await getPublishedBooks(filters);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch books" }, { status: 500 });
  }
}
