-- AI usage metadata for operational cost/debug visibility.
-- Do not store mechanic notes, transcripts, professional text, audio, phone, or plate here.

create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),

  feature text not null check (feature in ('professional_note', 'transcription')),
  function_name text not null,
  model text not null,
  status text not null check (status in ('success', 'error')),

  input_tokens integer,
  output_tokens integer,
  audio_seconds numeric(10,2),
  estimated_cost_usd numeric(12,6) not null default 0,
  retry_count integer not null default 0,
  error_summary text,

  created_at timestamptz not null default now()
);

create index if not exists idx_ai_usage_logs_created_at
  on public.ai_usage_logs(created_at desc);

create index if not exists idx_ai_usage_logs_feature
  on public.ai_usage_logs(feature);

create index if not exists idx_ai_usage_logs_status
  on public.ai_usage_logs(status);
