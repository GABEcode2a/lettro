create table if not exists public.user_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  generation_count integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.user_usage enable row level security;

create policy "Users can view own usage"
  on public.user_usage
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own usage"
  on public.user_usage
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own usage"
  on public.user_usage
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
