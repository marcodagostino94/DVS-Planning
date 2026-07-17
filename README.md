# DVS Planning — Build 8.0

Build 8.0 corretta con drag multiplo reale.

## Drag di gruppo

La selezione viene congelata all’inizio del trascinamento. Tutti i turni selezionati della stessa sala vengono spostati insieme.

Esempio: 10, 11 e 12 trascinati dal 10 al 15 diventano 15, 16 e 17.

Due turni presenti entrambi il 10 restano entrambi nello stesso giorno di destinazione.

Prima del salvataggio viene verificato l’intero gruppo; se un solo turno è incompatibile, nessuno viene spostato.


## Build 8.0 — consolidamento
- Ripristinata selezione visiva delle celle vuote e doppio clic per Nuovo turno.
- Aggiunto Taglia con ⌘X/menu contestuale e stato visivo fino all’incolla.
- Aggiunto controllo atomico dei conflitti prima dell’incolla di un gruppo tagliato.
- Drag multiplo con anteprima reale delle card e destinazioni evidenziate per tutto il gruppo.


## Build 8.0 — Dipendenti

La sezione Montatori è stata sostituita da Dipendenti. Ogni record contiene nome, cognome, qualifica, telefono, email e note. Telefono, email e note sono visibili direttamente nell’elenco quando presenti. La modifica consente anche l’eliminazione definitiva con conferma.

### Supabase

1. Eseguire `database/003_staff_build_8.sql`.
2. Eseguire `database/004_seed_staff_from_excel.sql` per importare l’elenco iniziale.
3. Verificare `src/config.js`.
