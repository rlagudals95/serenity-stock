select cron.unschedule(jobid)
from cron.job
where jobname in ('serenity-ingest-x', 'serenity-analyze-posts');
