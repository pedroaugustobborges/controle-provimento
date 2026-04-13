-- Enable pg_cron if not enabled (Supabase typically has it)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule backup everyday at 00:00 UTC
-- Replace SUPABASE_PROJECT_ID with your project ID
SELECT cron.schedule (
  'daily-database-backup',
  '0 0 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://' || (SELECT setting FROM pg_settings WHERE name = 'cluster_name') || '.supabase.co/functions/v1/database-backup',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
    ) as request_id;
  $$
);
