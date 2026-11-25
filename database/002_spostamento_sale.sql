-- Planning DVS 51.2: eseguire dopo 001_variazioni.sql (già eseguito per la 51.1).
-- Non modifica i turni esistenti. Aggiunge lo spostamento atomico fra sale.
BEGIN;
ALTER TABLE public.planning_migrations ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.move_variation_rooms(moves jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE item jsonb; src public.shifts%ROWTYPE; expected public.shifts%ROWTYPE;
  key text; ids text[]; changed jsonb := '[]'; related jsonb; previous_setting text;
BEGIN
  IF jsonb_typeof(moves) IS DISTINCT FROM 'array' OR jsonb_array_length(moves)=0 THEN
    RAISE EXCEPTION 'Nessun turno da spostare';
  END IF;
  SELECT array_agg(x->'expected'->>'id') INTO ids FROM jsonb_array_elements(moves) x;
  IF array_position(ids,NULL) IS NOT NULL OR cardinality(ids)<>(SELECT count(DISTINCT x) FROM unnest(ids) x) THEN
    RAISE EXCEPTION 'Elenco turni non valido';
  END IF;
  LOCK TABLE public.shifts IN SHARE ROW EXCLUSIVE MODE;
  -- Tutti i controlli prima di qualsiasi scrittura.
  FOR item IN SELECT * FROM jsonb_array_elements(moves) LOOP
    SELECT * INTO src FROM public.shifts WHERE id::text=item->'expected'->>'id' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Turno non più disponibile'; END IF;
    expected:=jsonb_populate_record(NULL::public.shifts,item->'expected');
    FOR key IN SELECT jsonb_object_keys(item->'expected') LOOP
      IF to_jsonb(src)->key IS DISTINCT FROM to_jsonb(expected)->key THEN
        RAISE EXCEPTION 'Il turno è cambiato: ricarica e riprova';
      END IF;
    END LOOP;
    IF src.confirmed THEN RAISE EXCEPTION 'Turno confermato: sbloccalo prima'; END IF;
    IF coalesce(item->>'room','') !~ '^(sala-([1-9]|1[0-5])|remoto-[1-3])$' THEN
      RAISE EXCEPTION 'Sala non valida';
    END IF;
    -- Una X non occupa la sala; per i turni attivi controlla anche gli altri mossi.
    IF NOT src.is_varied AND EXISTS (
      SELECT 1 FROM public.shifts other
      LEFT JOIN LATERAL (
        SELECT value->>'room' AS new_room FROM jsonb_array_elements(moves)
        WHERE value->'expected'->>'id'=other.id::text
      ) planned ON true
      WHERE other.id<>src.id AND NOT other.is_varied
        AND coalesce(planned.new_room,other.room_code)=item->>'room'
        AND other.shift_date=src.shift_date
        AND other.start_time < CASE WHEN src.end_is_24 THEN '24:00'::time ELSE src.end_time END
        AND src.start_time < CASE WHEN other.end_is_24 THEN '24:00'::time ELSE other.end_time END
    ) THEN RAISE EXCEPTION 'La sala è occupata in quell’orario'; END IF;
  END LOOP;
  previous_setting:=current_setting('dvs.variation_write',true);
  PERFORM set_config('dvs.variation_write','on',true);
  FOR item IN SELECT * FROM jsonb_array_elements(moves) LOOP
    UPDATE public.shifts SET room_code=item->>'room'
      WHERE id::text=item->'expected'->>'id' RETURNING * INTO src;
    -- Aggiorna entrambi i collegamenti se il turno è intermedio in una catena.
    UPDATE public.shift_variations SET
      source_snapshot=CASE WHEN source_id=src.id THEN jsonb_set(source_snapshot,'{room_code}',to_jsonb(src.room_code)) ELSE source_snapshot END,
      target_snapshot=CASE WHEN target_id=src.id THEN jsonb_set(target_snapshot,'{room_code}',to_jsonb(src.room_code)) ELSE target_snapshot END,
      updated_at=now()
      WHERE source_id=src.id OR target_id=src.id;
    changed:=changed || jsonb_build_array(to_jsonb(src));
  END LOOP;
  SELECT coalesce(jsonb_agg(to_jsonb(v)),'[]'::jsonb) INTO related
    FROM public.shift_variations v WHERE source_id::text=ANY(ids) OR target_id::text=ANY(ids);
  PERFORM set_config('dvs.variation_write',coalesce(previous_setting,''),true);
  RETURN jsonb_build_object('shifts',changed,'variations',related);
END $$;
REVOKE ALL ON FUNCTION public.move_variation_rooms(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.move_variation_rooms(jsonb) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
