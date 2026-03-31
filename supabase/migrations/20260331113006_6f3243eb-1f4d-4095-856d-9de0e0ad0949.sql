
-- Enable trigram extension first
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Groups table
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT 'hsl(175, 80%, 50%)',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tags table
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Items table
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('link', 'file', 'text', 'github')),
  title TEXT NOT NULL,
  summary TEXT,
  source_url TEXT,
  raw_content TEXT,
  extracted_content TEXT,
  keywords TEXT[] DEFAULT '{}',
  telegram_message_id BIGINT,
  telegram_chat_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Junction tables
CREATE TABLE public.item_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(item_id, tag_id)
);

CREATE TABLE public.item_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(item_id, group_id)
);

-- Telegram bot state
CREATE TABLE public.telegram_bot_state (
  id INT PRIMARY KEY CHECK (id = 1),
  update_offset BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.telegram_bot_state (id, update_offset) VALUES (1, 0);

-- Indexes
CREATE INDEX idx_items_type ON public.items(type);
CREATE INDEX idx_items_created_at ON public.items(created_at DESC);
CREATE INDEX idx_items_title_trgm ON public.items USING gin(title gin_trgm_ops);
CREATE INDEX idx_items_keywords ON public.items USING gin(keywords);

-- RLS + policies
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_bot_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on items" ON public.items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on groups" ON public.groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on tags" ON public.tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on item_tags" ON public.item_tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on item_groups" ON public.item_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on telegram_bot_state" ON public.telegram_bot_state FOR ALL USING (true) WITH CHECK (true);
