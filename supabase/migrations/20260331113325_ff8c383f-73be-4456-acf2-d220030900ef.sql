
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'poll-telegram-updates',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://vxyqcbgtjuxcahbtshhq.supabase.co/functions/v1/telegram-poll',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4eXFjYmd0anV4Y2FoYnRzaGhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NTA3MTQsImV4cCI6MjA5MDUyNjcxNH0.9ygGJshOCNUa0TSnLDGQW6O5GgnBUU2MfsJWB5CqYqQ"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);
