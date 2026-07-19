-- One-time prerequisites in Supabase SQL Editor:
--
-- select vault.create_secret(
--   'https://YOUR_PROJECT_REF.supabase.co',
--   'serenity_project_url'
-- );
-- select vault.create_secret(
--   'THE_SAME_VALUE_AS_SERENITY_CRON_SECRET',
--   'serenity_cron_secret'
-- );
--
-- Run this file only after both secrets exist.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

do $$
begin
  if not exists (
    select 1
    from vault.decrypted_secrets
    where name = 'serenity_project_url'
  ) then
    raise exception 'Vault secret serenity_project_url is required';
  end if;

  if not exists (
    select 1
    from vault.decrypted_secrets
    where name = 'serenity_cron_secret'
  ) then
    raise exception 'Vault secret serenity_cron_secret is required';
  end if;
end;
$$;

select cron.unschedule(jobid)
from cron.job
where jobname in ('serenity-ingest-x', 'serenity-analyze-posts');

select cron.schedule(
  'serenity-ingest-x',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'serenity_project_url'
    ) || '/functions/v1/ingest-x',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-serenity-cron-secret', (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'serenity_cron_secret'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 140000
  );
  $$
);

select cron.schedule(
  'serenity-analyze-posts',
  '2-59/15 * * * *',
  $$
  select net.http_post(
    url := (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'serenity_project_url'
    ) || '/functions/v1/analyze-posts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-serenity-cron-secret', (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'serenity_cron_secret'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 140000
  );
  $$
);

select jobid, jobname, schedule, active
from cron.job
where jobname in ('serenity-ingest-x', 'serenity-analyze-posts')
order by jobname;
