-- Planning DVS 51.1. Eseguire con le vecchie app chiuse, prima di pubblicare.
-- Migrazione ripetibile: la lettura delle note avviene UNA SOLA VOLTA.
BEGIN;
CREATE TABLE IF NOT EXISTS public.planning_migrations (
  name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now(), details jsonb
);
ALTER TABLE public.planning_migrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.planning_migrations FROM anon, authenticated;
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS is_varied boolean NOT NULL DEFAULT false;
DO $$
DECLARE old_count bigint; new_count bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.planning_migrations WHERE name='51.1-legacy-varied') THEN
    SELECT count(*) INTO old_count FROM public.shifts
      WHERE coalesce(notes,'') ~ '(^|[\n\r])SPOSTATO AL [0-9]{1,2} ';
    UPDATE public.shifts SET is_varied=true
      WHERE coalesce(notes,'') ~ '(^|[\n\r])SPOSTATO AL [0-9]{1,2} ';
    SELECT count(*) INTO new_count FROM public.shifts WHERE is_varied;
    IF old_count <> new_count THEN RAISE EXCEPTION 'Conteggio X non coerente: migrazione annullata'; END IF;
    INSERT INTO public.planning_migrations(name,details)
      VALUES ('51.1-legacy-varied',jsonb_build_object('old_x',old_count,'new_x',new_count));
  END IF;
END $$;

-- Usa lo stesso tipo di identificativo già presente in shifts.
DO $$ DECLARE id_type text;
BEGIN
  SELECT format_type(atttypid,atttypmod) INTO id_type FROM pg_attribute
    WHERE attrelid='public.shifts'::regclass AND attname='id';
  EXECUTE format('CREATE TABLE IF NOT EXISTS public.shift_variations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id %s NOT NULL UNIQUE REFERENCES public.shifts(id) ON DELETE RESTRICT,
    target_id %s NOT NULL UNIQUE REFERENCES public.shifts(id) ON DELETE RESTRICT,
    source_snapshot jsonb NOT NULL,
    target_snapshot jsonb NOT NULL,
    to_note text NOT NULL,
    from_note text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (source_id <> target_id))',id_type,id_type);
END $$;
ALTER TABLE public.shift_variations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS variations_visible_shifts ON public.shift_variations;
CREATE POLICY variations_visible_shifts ON public.shift_variations
  FOR ALL TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.shifts s WHERE s.id=source_id)
     AND EXISTS (SELECT 1 FROM public.shifts t WHERE t.id=target_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.shifts s WHERE s.id=source_id)
     AND EXISTS (SELECT 1 FROM public.shifts t WHERE t.id=target_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_variations TO anon, authenticated;

-- Le scritture di collegamenti e stato passano dalla transazione applicativa.
CREATE OR REPLACE FUNCTION public.guard_planning_variation() RETURNS trigger
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
  IF current_setting('dvs.variation_write',true)='on' THEN
    IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;
  IF TG_TABLE_NAME='shift_variations' THEN
    RAISE EXCEPTION 'Usa le operazioni Variazione di Planning 51.1';
  END IF;
  IF TG_OP='INSERT' THEN
    -- Consente il ripristino di un vecchio turno eliminato (Annulla/Importa).
    -- I nuovi turni ordinari sono sempre creati con is_varied=false.
    RETURN NEW;
  END IF;
  IF TG_OP='DELETE' THEN
    IF EXISTS(SELECT 1 FROM public.shift_variations WHERE source_id=OLD.id OR target_id=OLD.id) THEN
      RAISE EXCEPTION 'Questo turno è collegato: usa Annulla variazione';
    END IF;
    RETURN OLD;
  END IF;
  IF NEW.is_varied IS DISTINCT FROM OLD.is_varied THEN
    RAISE EXCEPTION 'Lo stato spostato può cambiare solo tramite Variazione';
  END IF;
  IF (NEW.shift_date,NEW.room_code,NEW.start_time,NEW.end_time,NEW.end_is_24)
     IS DISTINCT FROM (OLD.shift_date,OLD.room_code,OLD.start_time,OLD.end_time,OLD.end_is_24)
     AND EXISTS(SELECT 1 FROM public.shift_variations WHERE source_id=OLD.id OR target_id=OLD.id) THEN
    RAISE EXCEPTION 'Usa Modifica variazione per cambiare data, sala o orario';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_variation_shifts ON public.shifts;
CREATE TRIGGER guard_variation_shifts BEFORE INSERT OR UPDATE OR DELETE ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION public.guard_planning_variation();
DROP TRIGGER IF EXISTS guard_variation_links ON public.shift_variations;
CREATE TRIGGER guard_variation_links BEFORE INSERT OR UPDATE OR DELETE ON public.shift_variations
  FOR EACH ROW EXECUTE FUNCTION public.guard_planning_variation();

-- Sostituisce soltanto la dicitura automatica di questa variazione.
CREATE OR REPLACE FUNCTION public.variation_note(note text, old_line text, new_line text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path=public,pg_temp AS $$
DECLARE result text;
BEGIN
  result := btrim(replace(coalesce(note,''),coalesce(nullif(old_line,''),chr(1)),''),E' \n\r');
  IF coalesce(new_line,'')<>'' THEN result:=concat_ws(E'\n',nullif(result,''),new_line); END IF;
  IF length(result)>100 THEN RAISE EXCEPTION 'Nota oltre 100 caratteri: accorciala e riprova'; END IF;
  RETURN nullif(result,'');
END $$;

-- SECURITY INVOKER: conserva i permessi e le policy già applicati a shifts.
CREATE OR REPLACE FUNCTION public.apply_shift_variation(
  operation text, expected_source jsonb, expected_target jsonb DEFAULT NULL,
  link_id uuid DEFAULT NULL, destination jsonb DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE
  src public.shifts%ROWTYPE; dst public.shifts%ROWTYPE;
  exp public.shifts%ROWTYPE; link public.shift_variations%ROWTYPE;
  original public.shifts%ROWTYPE; patch public.shifts%ROWTYPE;
  key text; new_to text; new_from text; old_setting text;
BEGIN
  IF operation NOT IN ('create','edit','cancel') THEN RAISE EXCEPTION 'Operazione non valida'; END IF;
  -- Serializza anche con inserimenti/spostamenti normali di altre postazioni.
  LOCK TABLE public.shifts IN SHARE ROW EXCLUSIVE MODE;
  SELECT * INTO src FROM public.shifts WHERE id::text=expected_source->>'id' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Turno originale non disponibile'; END IF;
  exp:=jsonb_populate_record(NULL::public.shifts,expected_source);
  FOR key IN SELECT jsonb_object_keys(expected_source) LOOP
    IF to_jsonb(src)->key IS DISTINCT FROM to_jsonb(exp)->key THEN
      RAISE EXCEPTION 'Il turno originale è cambiato. Riapri la finestra';
    END IF;
  END LOOP;
  IF src.confirmed THEN RAISE EXCEPTION 'Turno originale confermato: sbloccalo prima'; END IF;
  IF operation='create' THEN
    IF src.is_varied THEN RAISE EXCEPTION 'Turno già spostato'; END IF;
    dst:=jsonb_populate_record(src,jsonb_build_object('id',gen_random_uuid(),'is_varied',false,
      'confirmed',false,'confirmed_at',NULL,'created_at',now()));
    original:=src;
  ELSE
    SELECT * INTO link FROM public.shift_variations WHERE id=link_id AND source_id=src.id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Collegamento non disponibile'; END IF;
    SELECT * INTO dst FROM public.shifts WHERE id=link.target_id FOR UPDATE;
    IF NOT FOUND OR expected_target IS NULL THEN RAISE EXCEPTION 'Turno destinazione non disponibile'; END IF;
    exp:=jsonb_populate_record(NULL::public.shifts,expected_target);
    FOR key IN SELECT jsonb_object_keys(expected_target) LOOP
      IF to_jsonb(dst)->key IS DISTINCT FROM to_jsonb(exp)->key THEN
        RAISE EXCEPTION 'Il turno di destinazione è cambiato. Riapri la finestra';
      END IF;
    END LOOP;
    IF dst.is_varied OR EXISTS(SELECT 1 FROM public.shift_variations WHERE source_id=dst.id) THEN
      RAISE EXCEPTION 'Gestisci prima la variazione successiva';
    END IF;
    IF dst.confirmed THEN RAISE EXCEPTION 'Turno di destinazione confermato: sbloccalo prima'; END IF;
    original:=jsonb_populate_record(NULL::public.shifts,link.source_snapshot);
  END IF;
  IF operation='cancel' THEN
    patch:=src;
  ELSE
    IF destination IS NULL THEN RAISE EXCEPTION 'Destinazione mancante'; END IF;
    patch:=jsonb_populate_record(dst,jsonb_build_object(
      'shift_date',destination->>'date','room_code',destination->>'room',
      'start_time',destination->>'start','end_time',CASE WHEN destination->>'end'='24:00' THEN '00:00' ELSE destination->>'end' END,
      'end_is_24',(destination->>'end'='24:00')));
    IF patch.shift_date IS NULL OR patch.room_code IS NULL OR patch.start_time IS NULL OR patch.end_time IS NULL
      OR patch.start_time >= (CASE WHEN patch.end_is_24 THEN '24:00'::time ELSE patch.end_time END) THEN
      RAISE EXCEPTION 'Data, sala o orario non valido';
    END IF;
    IF patch.room_code !~ '^(sala-([1-9]|1[0-5])|remoto-[1-3])$' THEN
      RAISE EXCEPTION 'Sala non valida';
    END IF;
    IF (patch.shift_date,patch.room_code,patch.start_time,patch.end_time,patch.end_is_24)=
       (src.shift_date,src.room_code,src.start_time,src.end_time,src.end_is_24) THEN
      RAISE EXCEPTION 'Destinazione uguale all’origine: usa Annulla variazione';
    END IF;
  END IF;
  IF EXISTS(SELECT 1 FROM public.shifts s WHERE NOT s.is_varied AND s.id<>src.id AND s.id<>dst.id
      AND s.shift_date=patch.shift_date AND s.room_code=patch.room_code
      AND s.start_time < CASE WHEN patch.end_is_24 THEN '24:00'::time ELSE patch.end_time END
      AND patch.start_time < CASE WHEN s.end_is_24 THEN '24:00'::time ELSE s.end_time END) THEN
    RAISE EXCEPTION 'La sala è occupata in questa fascia oraria';
  END IF;
  old_setting:=current_setting('dvs.variation_write',true);
  PERFORM set_config('dvs.variation_write','on',true);
  IF operation='cancel' THEN
    DELETE FROM public.shift_variations WHERE id=link.id;
    DELETE FROM public.shifts WHERE id=dst.id;
    UPDATE public.shifts SET is_varied=false,
      staff_id=CASE WHEN EXISTS(SELECT 1 FROM public.staff WHERE id=original.staff_id) THEN original.staff_id ELSE NULL END,
      notes=public.variation_note(src.notes,link.to_note,NULL)
      WHERE id=src.id RETURNING * INTO src;
  ELSE
    new_to:='SPOSTATO AL '||extract(day FROM patch.shift_date)::int||' '||
      (ARRAY['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC'])[extract(month FROM patch.shift_date)::int]||' - MAIL';
    new_from:='SPOSTATO DAL '||extract(day FROM src.shift_date)::int||' '||
      (ARRAY['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC'])[extract(month FROM src.shift_date)::int]||' - MAIL';
    IF operation='create' THEN
      -- Non copiare le diciture di precedenti spostamenti sul nuovo turno.
      patch.notes:=public.variation_note(regexp_replace(coalesce(src.notes,''),'(^|[\n\r])SPOSTATO (AL|DAL) [0-9]{1,2} [A-Z]{3} - MAIL','', 'g'),NULL,new_from);
      INSERT INTO public.shifts SELECT (patch).* RETURNING * INTO dst;
      UPDATE public.shifts SET is_varied=true, staff_id=NULL,
        notes=public.variation_note(src.notes,NULL,new_to) WHERE id=src.id RETURNING * INTO src;
      INSERT INTO public.shift_variations(source_id,target_id,source_snapshot,target_snapshot,to_note,from_note)
        VALUES(src.id,dst.id,to_jsonb(original),to_jsonb(dst),new_to,new_from) RETURNING * INTO link;
    ELSE
      UPDATE public.shifts SET shift_date=patch.shift_date,room_code=patch.room_code,
        start_time=patch.start_time,end_time=patch.end_time,end_is_24=patch.end_is_24
        WHERE id=dst.id RETURNING * INTO dst;
      UPDATE public.shifts SET notes=public.variation_note(src.notes,link.to_note,new_to)
        WHERE id=src.id RETURNING * INTO src;
      UPDATE public.shift_variations SET to_note=new_to,target_snapshot=to_jsonb(dst),updated_at=now()
        WHERE id=link.id RETURNING * INTO link;
    END IF;
  END IF;
  PERFORM set_config('dvs.variation_write',coalesce(old_setting,''),true);
  RETURN jsonb_build_object('source',to_jsonb(src),'target',CASE WHEN operation='cancel' THEN NULL ELSE to_jsonb(dst) END,
    'link',CASE WHEN operation='cancel' THEN NULL ELSE to_jsonb(link) END,'deleted_id',CASE WHEN operation='cancel' THEN dst.id::text ELSE NULL END);
END $$;
REVOKE ALL ON FUNCTION public.apply_shift_variation(text,jsonb,jsonb,uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_shift_variation(text,jsonb,jsonb,uuid,jsonb) TO anon,authenticated;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') AND NOT EXISTS(
    SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='shift_variations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.shift_variations;
  END IF;
END $$;
NOTIFY pgrst, 'reload schema';
COMMIT;
SELECT details AS verifica_migrazione FROM public.planning_migrations WHERE name='51.1-legacy-varied';
