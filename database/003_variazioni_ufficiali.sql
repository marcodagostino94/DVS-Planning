-- Planning DVS 51.3: eseguire dopo 001 e 002, a vecchie app chiuse.
-- Le variazioni esistenti diventano ufficiali; nessun turno o nota viene riscritto.
-- Ripetibile: NON reimposta le variazioni non ufficiali create successivamente.
BEGIN;
ALTER TABLE public.shift_variations ADD COLUMN IF NOT EXISTS is_official boolean NOT NULL DEFAULT true;
CREATE OR REPLACE FUNCTION public.apply_shift_variation(
  operation text, expected_source jsonb, expected_target jsonb DEFAULT NULL,
  link_id uuid DEFAULT NULL, destination jsonb DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE
  src public.shifts%ROWTYPE; dst public.shifts%ROWTYPE;
  exp public.shifts%ROWTYPE; link public.shift_variations%ROWTYPE;
  original public.shifts%ROWTYPE; patch public.shifts%ROWTYPE;
  key text; new_to text; new_from text; old_setting text; official boolean;
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
  official:=coalesce((destination->>'official')::boolean,link.is_official,true);
  IF destination ? 'expected_updated_at' AND link.updated_at IS DISTINCT FROM (destination->>'expected_updated_at')::timestamptz THEN
    RAISE EXCEPTION 'La variazione è cambiata. Riapri la finestra';
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
      (ARRAY['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC'])[extract(month FROM patch.shift_date)::int]||CASE WHEN official THEN ' - VEDI MAIL' ELSE ' - NON UFFICIALE' END;
    new_from:='SPOSTATO DAL '||extract(day FROM src.shift_date)::int||' '||
      (ARRAY['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC'])[extract(month FROM src.shift_date)::int]||CASE WHEN official THEN ' - VEDI MAIL' ELSE ' - NON UFFICIALE' END;
    IF operation='create' THEN
      -- Non copiare le diciture di precedenti spostamenti sul nuovo turno.
      patch.notes:=public.variation_note(regexp_replace(coalesce(src.notes,''),'(^|[\n\r])SPOSTATO (AL|DAL) [0-9]{1,2} [A-Z]{3} - (VEDI MAIL|NON UFFICIALE|MAIL)','', 'g'),NULL,new_from);
      INSERT INTO public.shifts SELECT (patch).* RETURNING * INTO dst;
      UPDATE public.shifts SET is_varied=true, staff_id=NULL,
        notes=public.variation_note(src.notes,NULL,new_to) WHERE id=src.id RETURNING * INTO src;
      INSERT INTO public.shift_variations(source_id,target_id,source_snapshot,target_snapshot,to_note,from_note,is_official)
        VALUES(src.id,dst.id,to_jsonb(original),to_jsonb(dst),new_to,new_from,official) RETURNING * INTO link;
    ELSE
      UPDATE public.shifts SET shift_date=patch.shift_date,room_code=patch.room_code,
        start_time=patch.start_time,end_time=patch.end_time,end_is_24=patch.end_is_24,
        notes=public.variation_note(dst.notes,link.from_note,new_from)
        WHERE id=dst.id RETURNING * INTO dst;
      UPDATE public.shifts SET notes=public.variation_note(src.notes,link.to_note,new_to)
        WHERE id=src.id RETURNING * INTO src;
      UPDATE public.shift_variations SET is_official=official,to_note=new_to,from_note=new_from,target_snapshot=to_jsonb(dst),updated_at=now()
        WHERE id=link.id RETURNING * INTO link;
    END IF;
  END IF;
  PERFORM set_config('dvs.variation_write',coalesce(old_setting,''),true);
  RETURN jsonb_build_object('source',to_jsonb(src),'target',CASE WHEN operation='cancel' THEN NULL ELSE to_jsonb(dst) END,
    'link',CASE WHEN operation='cancel' THEN NULL ELSE to_jsonb(link) END,'deleted_id',CASE WHEN operation='cancel' THEN dst.id::text ELSE NULL END);
END $$;
REVOKE ALL ON FUNCTION public.apply_shift_variation(text,jsonb,jsonb,uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_shift_variation(text,jsonb,jsonb,uuid,jsonb) TO anon,authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
SELECT count(*) FILTER (WHERE is_official) AS ufficiali, count(*) FILTER (WHERE NOT is_official) AS non_ufficiali FROM public.shift_variations;
