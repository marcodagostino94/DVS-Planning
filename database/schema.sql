-- DVS Planning — schema iniziale Build 3.0
-- NON è ancora collegato automaticamente alla Build 3.0.
-- Serve come base per la futura integrazione Supabase.

create extension if not exists btree_gist;

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  display_name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.films (
  id uuid primary key default gen_random_uuid(),
  production_name text not null,
  film_name text not null,
  color_key text not null,
  created_at timestamptz not null default now(),
  unique (production_name, film_name)
);

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  room_code text not null,
  shift_date date not null,
  production_name text not null,
  film_name text not null,
  start_time time not null,
  end_time time not null,
  work_type text not null
    check (work_type in ('EDIT','ASSISTENTE','GRAFICA','COLOR','SOUND DESIGN')),
  editor_name text,
  status text not null
    check (status in ('provvisorio','definitivo')),
  color_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_time_range check (end_time > start_time)
);

alter table public.shifts
  drop constraint if exists shifts_room_time_no_overlap;

alter table public.shifts
  add constraint shifts_room_time_no_overlap
  exclude using gist (
    room_code with =,
    shift_date with =,
    tsrange(
      shift_date + start_time,
      shift_date + end_time,
      '[)'
    ) with &&
  );

alter table public.people enable row level security;
alter table public.films enable row level security;
alter table public.shifts enable row level security;

-- Le policy definitive verranno aggiunte insieme a Supabase Auth.
