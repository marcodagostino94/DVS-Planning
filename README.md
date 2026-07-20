# DVS Planning · v_10_CORREZIONI ULTIME

Base ufficiale: Build 9.0.

## Novità principali
- Vista mensile composta sempre da settimane complete, da lunedì a domenica.
- Popup unico per inserimento e modifica dei turni.
- Creazione multipla per intervallo e giorni della settimana.
- Dipendente ricercabile dal database, modalità CLIENTE e doppia postazione.
- Stato definitivo/provvisorio e selezione colore solo per i definitivi.
- Conferma turno esclusivamente dal menu del tasto destro.
- Un turno confermato è totalmente bloccato e ha una saturazione maggiore.
- Annullamento della conferma con richiesta esplicita di conferma.

## Database
Eseguire, nell'ordine già previsto dal progetto, la migrazione:
`database/006_shifts_build_10.sql`


## Migrazione luglio 2026
Dopo la migrazione 006 già eseguita, eseguire `database/007_seed_shifts_luglio_2026.sql`. La query è idempotente e può essere rilanciata senza duplicare i turni.

## Build 13.3 — Backup Agent
Eseguire prima `database/010_backup_agent_status_build_13_3.sql`, installare DVS Backup Agent 0.4.0 e sostituire `downloads/DVS_Backup_Agent.pkg` prima del push GitHub.


## Build 14.0 — Turni variabili
Eseguire `database/011_shift_variabile_build_14.sql` su Supabase prima di pubblicare la build.
La finestra Nuovo/Modifica turno include l'opzione VARIABILE; sulla card compare `EDIT - VARIABILE`, con VARIABILE in rosso.
