-- ============================================================
-- ROW LEVEL SECURITY — run after schema.sql
-- ============================================================

ALTER TABLE books        ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory    ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_images  ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_logs  ENABLE ROW LEVEL SECURITY;

-- ─── PUBLIC: read published books only ───────────────────────────────────────
CREATE POLICY "public_read_books" ON books
  FOR SELECT USING (is_published = TRUE);

CREATE POLICY "public_read_categories" ON categories
  FOR SELECT USING (TRUE);

CREATE POLICY "public_read_inventory" ON inventory
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM books
      WHERE id = inventory.book_id AND is_published = TRUE
    )
  );

CREATE POLICY "public_read_images" ON book_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM books
      WHERE id = book_images.book_id AND is_published = TRUE
    )
  );

-- ─── ADMIN: full access for authenticated users ───────────────────────────────
CREATE POLICY "admin_all_books" ON books
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "admin_all_categories" ON categories
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "admin_all_inventory" ON inventory
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "admin_all_images" ON book_images
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "admin_read_logs" ON change_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "admin_insert_logs" ON change_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- STORAGE BUCKET
-- Run these after creating the bucket in the Supabase dashboard
-- or run them here to create it via SQL
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'book-images',
  'book-images',
  TRUE,
  5242880,   -- 5 MB
  ARRAY['image/jpeg','image/jpg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Public can view
CREATE POLICY "public_read_book_images" ON storage.objects
  FOR SELECT USING (bucket_id = 'book-images');

-- Authenticated can upload
CREATE POLICY "admin_upload_book_images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'book-images' AND auth.role() = 'authenticated'
  );

-- Authenticated can delete
CREATE POLICY "admin_delete_book_images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'book-images' AND auth.role() = 'authenticated'
  );
