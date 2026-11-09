select cron.schedule(
  'cancel-stale-pending-orders',
  '*/30 * * * *',
  $$
  select
    net.http_post(
        url:='https://oeyprcwaslsmucjsukbz.supabase.co/functions/v1/cancel-stale-orders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9leXByY3dhc2xzbXVjanN1a2J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDU4NDAsImV4cCI6MjA4ODM4MTg0MH0.Qvf6tqL3We3A23fGioLm0hu4YY7KNZ7Kp5_xgURpApQ"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);