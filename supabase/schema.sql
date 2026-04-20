-- ============================================================
-- BOOKS CATALOG — Supabase Schema
-- Run this first in the Supabase SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── CATEGORIES ──────────────────────────────────────────────────────────────
CREATE TABLE categories (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  name_he    TEXT,
  slug       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── BOOKS ───────────────────────────────────────────────────────────────────
CREATE TABLE books (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        TEXT NOT NULL,
  title_he     TEXT,
  author       TEXT NOT NULL DEFAULT '',
  description  TEXT,
  category_id  UUID REFERENCES categories(id) ON DELETE SET NULL,
  price        NUMERIC(10,2),
  sku          TEXT UNIQUE,
  publisher    TEXT,
  year         INTEGER,
  language     TEXT DEFAULT 'Hebrew',
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  slug         TEXT NOT NULL UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INVENTORY ───────────────────────────────────────────────────────────────
CREATE TABLE inventory (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id    UUID NOT NULL UNIQUE REFERENCES books(id) ON DELETE CASCADE,
  quantity   INTEGER NOT NULL DEFAULT 1,
  in_stock   BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── BOOK IMAGES ─────────────────────────────────────────────────────────────
CREATE TABLE book_images (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id      UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  image_url    TEXT NOT NULL,
  storage_path TEXT,          -- NULL for legacy/external URLs
  alt_text     TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_cover     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── CHANGE LOGS ─────────────────────────────────────────────────────────────
CREATE TABLE change_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL,
  entity_id   UUID NOT NULL,
  action      TEXT NOT NULL,   -- 'create' | 'update' | 'delete'
  changed_by  UUID REFERENCES auth.users(id),
  payload     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INDEXES ─────────────────────────────────────────────────────────────────
CREATE INDEX idx_books_slug       ON books(slug);
CREATE INDEX idx_books_category   ON books(category_id);
CREATE INDEX idx_books_published  ON books(is_published);
CREATE INDEX idx_books_fts        ON books
  USING GIN (to_tsvector('simple',
    title || ' ' || COALESCE(author,'') || ' ' || COALESCE(title_he,'')
  ));
CREATE INDEX idx_book_images_book ON book_images(book_id);
CREATE INDEX idx_inventory_book   ON inventory(book_id);
CREATE INDEX idx_logs_entity      ON change_logs(entity_type, entity_id);

-- ─── updated_at TRIGGER ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_books_updated_at
  BEFORE UPDATE ON books FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_inventory_updated_at
  BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── SINGLE COVER CONSTRAINT ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION enforce_single_cover()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_cover THEN
    UPDATE book_images SET is_cover = FALSE
    WHERE book_id = NEW.book_id AND id <> NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_single_cover
  BEFORE INSERT OR UPDATE ON book_images
  FOR EACH ROW WHEN (NEW.is_cover = TRUE)
  EXECUTE FUNCTION enforce_single_cover();

-- ─── DEFAULT CATEGORIES ───────────────────────────────────────────────────────
INSERT INTO categories (name, name_he, slug) VALUES
  ('Jewish Studies',  'מדעי היהדות',  'jewish-studies'),
  ('Philosophy',      'פילוסופיה',     'philosophy'),
  ('History',         'היסטוריה',      'history'),
  ('Languages',       'שפות',          'languages'),
  ('Literature',      'ספרות',         'literature'),
  ('Science',         'מדע',           'science'),
  ('Kabbalah',        'קבלה',          'kabbalah'),
  ('Bible Studies',   'מדעי המקרא',   'bible-studies'),
  ('Talmud',          'תלמוד',         'talmud'),
  ('Art History',     'היסטוריה של האמנות', 'art-history');
