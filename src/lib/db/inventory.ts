import { createClient } from "@/lib/supabase/server";

export async function getLowStockBooks(threshold = 2) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory")
    .select("*, book:books(id, title, title_he, slug)")
    .eq("in_stock", true)
    .lte("quantity", threshold)
    .order("quantity");
  if (error) throw error;
  return data ?? [];
}
