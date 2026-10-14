-- NON eseguire durante l'aggiornamento. Solo per annullare la conversione colori.
-- Ripristina solo dove il colore è ancora quello assegnato dalla migrazione.
-- Non può distinguere una successiva scelta manuale dello stesso colore.
BEGIN;
UPDATE public.shifts s SET color_key=b.original_color
FROM public.planning_color_backup_v41 b
WHERE s.id::text=b.shift_id AND s.color_key=b.replacement_color;
COMMIT;
-- Per rivedere le vecchie tonalità occorre usare anche il codice della v40.
-- La tabella di sicurezza e i blocchi sala vengono conservati.
