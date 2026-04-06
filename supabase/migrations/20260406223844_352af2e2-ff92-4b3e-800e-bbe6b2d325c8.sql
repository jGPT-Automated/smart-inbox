CREATE TABLE public.user_credentials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label text NOT NULL DEFAULT '',
  credential_type text NOT NULL DEFAULT 'telegram_bot',
  encrypted_value text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on user_credentials" ON public.user_credentials FOR ALL USING (true) WITH CHECK (true);