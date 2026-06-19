-- Speakly AI - Supabase schema
-- Run this in the Supabase SQL editor.

-- User profiles & level tracking ------------------------------------------
create table if not exists public.profiles (
    id uuid primary key default gen_random_uuid(),
    email text,
    level text not null default 'A1' check (level in ('A1', 'A2', 'B1')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Completed practice sessions ---------------------------------------------
create table if not exists public.sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.profiles(id) on delete set null,
    scenario text not null,
    level text not null,
    score int not null default 0,
    level_estimate text,
    summary text,
    mistakes jsonb not null default '[]'::jsonb,
    transcript jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists sessions_user_id_idx on public.sessions (user_id);
create index if not exists sessions_created_at_idx on public.sessions (created_at desc);

-- Keep profiles.updated_at fresh ------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
    before update on public.profiles
    for each row execute function public.set_updated_at();
