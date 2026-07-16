# DVS Planning — Build 5.0

Build di produttività basata sulla Build 4.0 confermata.

## Novità

- montatori sempre nel formato `M. COGNOME`;
- pallino celeste in alto a destra nella cella selezionata;
- hover delle celle molto più discreto;
- copia del turno con `⌘C`;
- incolla nella cella selezionata con `⌘V`;
- controllo degli orari incompatibili prima dell'incolla;
- selezione multipla con `Shift + clic`;
- selezione multipla limitata alla stessa sala;
- operazioni compatibili con turni definitivi e provvisori;
- drag & drop, doppio clic, zoom e stile della Build 4.0 mantenuti;
- Supabase e Realtime mantenuti.

## Installazione

Sostituisci i file della Build 4.0 nella root del repository con tutto il contenuto
della cartella Build 5.0, quindi esegui Commit e Push da GitHub Desktop.

## Database

La Build 5.0 usa lo stesso schema database della 4.0.
Non è necessario eseguire nuovi script SQL se hai già eseguito:

1. `database/001_initial_schema.sql`
2. `database/002_seed_rooms.sql`

Configura `src/config.js` con Project URL e Publishable Key per usare Supabase.
