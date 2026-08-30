alter table public.recipe_import_jobs
  add column ai_provider text not null default 'auto'
  constraint recipe_import_jobs_ai_provider_check
  check (ai_provider in ('auto', 'qwen', 'gemini'));
