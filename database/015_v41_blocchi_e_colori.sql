-- DVS Planning v41. Eseguire una volta dal SQL Editor prima di pubblicare la v41.
-- Operazione atomica: se una parte fallisce non viene applicato nulla.
BEGIN;
CREATE TABLE IF NOT EXISTS public.room_blocks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 room text NOT NULL,
 date date NOT NULL,
 all_day boolean NOT NULL DEFAULT true,
 start text,
 "end" text,
 note text NOT NULL CHECK (length(trim(note)) BETWEEN 1 AND 200),
 CHECK (all_day OR (start ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "end" ~ '^(([01][0-9]|2[0-3]):[0-5][0-9]|24:00)$' AND start < "end" AND start IS NOT NULL AND "end" IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS room_blocks_date_room ON public.room_blocks(date,room);
ALTER TABLE public.room_blocks ENABLE ROW LEVEL SECURITY;
-- Replica le autorizzazioni della tabella turni, senza introdurre accessi pubblici aggiuntivi.
-- Se le policy dei turni dipendono da colonne specifiche, lo script si interrompe
-- senza applicare modifiche: tali policy vanno adattate al modello dei blocchi.
DO $$
DECLARE p record; roles_sql text; n integer:=0;
BEGIN
 FOR p IN SELECT * FROM pg_policies WHERE schemaname='public' AND tablename='shifts' LOOP
  SELECT string_agg(quote_ident(x),',') INTO roles_sql FROM unnest(p.roles) x;
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.room_blocks',p.policyname);
  EXECUTE format('CREATE POLICY %I ON public.room_blocks AS %s FOR %s TO %s%s%s',p.policyname,p.permissive,p.cmd,roles_sql,
    CASE WHEN p.qual IS NOT NULL THEN ' USING ('||p.qual||')' ELSE '' END,
    CASE WHEN p.with_check IS NOT NULL THEN ' WITH CHECK ('||p.with_check||')' ELSE '' END);
  n:=n+1;
 END LOOP;
 IF n=0 THEN RAISE EXCEPTION 'Nessuna policy trovata su shifts: definire le autorizzazioni dei blocchi prima di proseguire.'; END IF;
 FOR p IN SELECT grantee,privilege_type FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name='shifts' AND grantee IN ('anon','authenticated','service_role') AND privilege_type IN ('SELECT','INSERT','UPDATE','DELETE') LOOP
  EXECUTE format('GRANT %s ON public.room_blocks TO %I',p.privilege_type,p.grantee);
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') AND NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='room_blocks') THEN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.room_blocks;
 END IF;
END $$;
-- Copia immutabile dei soli colori interessati. Non accessibile ai client web.
CREATE TABLE IF NOT EXISTS public.planning_color_backup_v41 (
 shift_id text PRIMARY KEY, original_color text NOT NULL, replacement_color text NOT NULL,
 saved_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.planning_color_backup_v41 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.planning_color_backup_v41 FROM anon,authenticated;
INSERT INTO public.planning_color_backup_v41(shift_id,original_color,replacement_color)
SELECT id::text,color_key,CASE color_key WHEN 'indigo' THEN 'violet' WHEN 'lime' THEN 'green' WHEN 'teal' THEN 'cyan' WHEN 'red' THEN 'violet' WHEN 'coral' THEN 'orange' END
FROM public.shifts WHERE color_key IN ('indigo','lime','teal','red','coral')
ON CONFLICT(shift_id) DO NOTHING;
UPDATE public.shifts SET color_key=CASE color_key WHEN 'indigo' THEN 'violet' WHEN 'lime' THEN 'green' WHEN 'teal' THEN 'cyan' WHEN 'red' THEN 'violet' WHEN 'coral' THEN 'orange' END
WHERE color_key IN ('indigo','lime','teal','red','coral');
-- amber resta la chiave tecnica: nella v41 viene chiamato Giallo e rappresentato #F2D22E.
COMMIT;
NOTIFY pgrst, 'reload schema';
