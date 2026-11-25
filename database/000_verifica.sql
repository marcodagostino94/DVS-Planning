-- Sola lettura: elenco dei turni che la versione 51 riconosce con la X.
SELECT id,shift_date,room_code,start_time,end_time,production,program_title,notes
FROM public.shifts
WHERE coalesce(notes,'') ~ '(^|[\n\r])SPOSTATO AL [0-9]{1,2} '
ORDER BY shift_date,room_code,start_time;
SELECT count(*) AS turni_con_x_prima_del_passaggio
FROM public.shifts
WHERE coalesce(notes,'') ~ '(^|[\n\r])SPOSTATO AL [0-9]{1,2} ';
