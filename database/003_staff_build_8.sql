-- DVS Planning — Build 8.0 / Sezione Dipendenti
-- Eseguire una sola volta in Supabase > SQL Editor.

create table if not exists public.staff (
  id text primary key,
  first_name text not null,
  last_name text not null,
  role text not null check (role in ('Montatore','Grafico','Colorist','Sound','Assistente','Altro')),
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_unique_name unique (first_name, last_name)
);

create index if not exists staff_last_name_first_name_idx
  on public.staff (lower(last_name), lower(first_name));

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_staff_updated_at on public.staff;
create trigger trg_staff_updated_at
before update on public.staff
for each row execute function public.set_updated_at();

-- Copia eventuali montatori già presenti, mantenendo gli ID usati dai turni.
insert into public.staff (id, first_name, last_name, role)
select id, first_name, last_name, 'Montatore'
from public.editors
on conflict (id) do update set
  first_name = excluded.first_name,
  last_name = excluded.last_name;

-- Mantiene il nome tecnico editor_id per compatibilità con i turni già creati,
-- ma collega il campo alla nuova anagrafica staff.
alter table public.shifts drop constraint if exists shifts_editor_id_fkey;
alter table public.shifts
  add constraint shifts_editor_id_fkey foreign key (editor_id)
  references public.staff(id) on delete set null;

alter table public.staff enable row level security;
drop policy if exists "prototype staff read" on public.staff;
drop policy if exists "prototype staff write" on public.staff;
create policy "prototype staff read" on public.staff
  for select to anon, authenticated using (true);
create policy "prototype staff write" on public.staff
  for all to anon, authenticated using (true) with check (true);

do $$
begin
  alter publication supabase_realtime add table public.staff;
exception when duplicate_object then null;
end $$;
