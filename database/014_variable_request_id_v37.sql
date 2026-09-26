-- DVS Planning v39.0. Eseguire solo se request_id non e gia presente.
-- Aggiunta compatibile con v36; non crea tabelle e non modifica dati o policy.
BEGIN;
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS request_id text;
COMMENT ON COLUMN public.shifts.request_id IS 'ID richiesta facoltativo per turni variabili; conserva zeri iniziali e lettere.';
COMMIT;
NOTIFY pgrst, 'reload schema';
