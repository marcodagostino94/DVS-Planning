-- DVS Planning — Build 3.0
-- Eseguire nel SQL Editor di Supabase.

create extension if not exists btree_gist;

create table if not exists public.shifts (
  id text primary key,
  room text not null,
  shift_date date not null,
  client text not null,
  film text not null,
  start_time time not null,
  end_time time not null,
  work_type text not null,
  editor text,
  status text not null check (status in ('provvisorio', 'definitivo')),
  color text not null default 'blue',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_shift_time check (end_time > start_time)
);

-- Impedisce sovrapposizioni nella stessa sala e giornata.
alter table public.shifts
  drop constraint if exists shifts_no_room_overlap;

alter table public.shifts
  add constraint shifts_no_room_overlap
  exclude using gist (
    room with =,
    shift_date with =,
    tsrange(
      shift_date + start_time,
      shift_date + end_time,
      '[)'
    ) with &&
  );

alter table public.shifts enable row level security;

-- Policy temporanee per il prototipo.
-- Quando aggiungeremo il login, verranno ristrette agli utenti autenticati.
drop policy if exists "prototype_read_shifts" on public.shifts;
create policy "prototype_read_shifts"
on public.shifts for select
to anon, authenticated
using (true);

drop policy if exists "prototype_insert_shifts" on public.shifts;
create policy "prototype_insert_shifts"
on public.shifts for insert
to anon, authenticated
with check (true);

drop policy if exists "prototype_update_shifts" on public.shifts;
create policy "prototype_update_shifts"
on public.shifts for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "prototype_delete_shifts" on public.shifts;
create policy "prototype_delete_shifts"
on public.shifts for delete
to anon, authenticated
using (true);

alter publication supabase_realtime add table public.shifts;
