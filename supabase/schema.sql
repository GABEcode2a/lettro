create table if not exists public.user_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  generation_count integer not null default 0,
  is_pro boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.user_usage
  add column if not exists is_pro boolean not null default false;

alter table public.user_usage
  add column if not exists resume_generation_count integer not null default 0;

alter table public.user_usage
  add column if not exists is_admin boolean not null default false;

alter table public.user_usage
  add column if not exists interview_prep_count integer not null default 0;

create or replace function public.protect_user_usage_admin_flag()
returns trigger
language plpgsql
as $$
begin
  if new.is_admin is distinct from old.is_admin then
    -- Block self-promotion via the client API; allow SQL editor and service role.
    if current_setting('request.jwt.claim.role', true) is not null
       and coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
      new.is_admin := old.is_admin;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_user_usage_admin_flag on public.user_usage;
create trigger protect_user_usage_admin_flag
  before update on public.user_usage
  for each row execute function public.protect_user_usage_admin_flag();

create or replace function public.handle_new_user_usage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_usage (user_id, generation_count)
  values (new.id, 0)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_usage on auth.users;
create trigger on_auth_user_created_usage
  after insert on auth.users
  for each row execute function public.handle_new_user_usage();

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
