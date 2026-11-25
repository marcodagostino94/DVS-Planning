# Planning DVS 51.1

Variazioni collegate nel database, Modifica variazione, Annulla variazione e disponibilità delle sale corretta. Base: Planning DVS 51 con grafica originale e blocco dello zoom accidentale.

## Installazione, nell’ordine
1. Eseguire un backup con l’Agent attuale e conservare lo ZIP della versione 51.
2. Chiudere Planning sulle postazioni durante il passaggio. Eseguire in Supabase SQL Editor `database/000_verifica.sql` per vedere i turni attualmente con la X.
3. Eseguire tutto `database/001_variazioni.sql`. È transazionale e ripetibile: la conversione dalle note viene fatta una sola volta. Il risultato `old_x` / `new_x` deve coincidere; un errore interrompe la migrazione. Non è stata eseguita sul database reale da chi ha preparato lo ZIP.
4. Pubblicare il contenuto di questa cartella, con index.html alla radice. Ricaricare l’app su tutte le postazioni e verificare 51.1 nelle Informazioni. Per un test isolato usare un database di prova con la stessa struttura e la sua configurazione in src/config.js: un semplice sito di test con la configurazione originale usa il database condiviso.
5. Dalle impostazioni dell’app scaricare e installare Backup Agent 2.3.0 sopra il precedente. La configurazione viene conservata. Eseguire Backup ora: il nuovo JSON include obbligatoriamente shift_variations e i campi is_varied di shifts. Restano le sette copie, i due Excel e la separazione annuale. Le precedenti versioni dell’Agent non salvano la nuova tabella.

## Uso
- Variazione: il turno originale conserva la posizione, perde il montatore e riceve la X. La destinazione è un nuovo turno attivo, collegato all’originale. I turni con X non occupano la sala e non entrano in Schema turni, Variabili o riepiloghi dipendenti; non contano nei KPI della giornata.
- Modifica variazione (menu del turno originale con X o del nuovo turno): cambia data, sala e orario della destinazione e aggiorna la dicitura sull’originale. Mantiene gli stessi due identificativi.
- Variazione sul turno di destinazione: crea un ulteriore spostamento. Il turno precedente più vecchio non viene modificato.
- Annulla variazione: la conferma mostra produzione/programma, data, sala e orario del turno da riattivare e di quello che verrà eliminato. Se la sala originale è occupata l’operazione si interrompe. Altrimenti toglie la X, rimuove il turno di destinazione e la dicitura automatica di quello spostamento, conservando le altre note. Ripristina il montatore originario se ancora in rubrica; restano i consueti avvisi per doppia presenza.
- Con una catena di spostamenti si gestisce prima l’ultimo. Le azioni sono disabilitate se uno dei due turni è confermato: sbloccarlo prima.
- Per i turni collegati le modifiche di data/sala/orario passano da Modifica variazione; trascinamento e taglia non possono interrompere il collegamento. Gli altri campi restano modificabili da Modifica turno. Per cancellare un turno collegato usare Annulla variazione.
- Lo storico Annulla/Ripristina generico viene azzerato dopo una transazione di variazione: l’operazione inversa è Annulla variazione, non il ripristino separato di singoli turni.

## Turni precedenti
La migrazione contrassegna esclusivamente i turni riconosciuti con X dalla versione 51, senza modificarne note, date, sale, orari o assegnazioni. Non abbina i turni alle loro destinazioni. Quelli con solo SPOSTATO DAL restano normali. Le vecchie coppie si possono eliminare manualmente e ricreare usando Variazione per ottenere il nuovo collegamento.
Dopo la migrazione scrivere o cancellare SPOSTATO nelle note non crea né rimuove la X. Non riaprire le vecchie versioni per creare variazioni: non gestiscono i collegamenti e lo stato strutturato. Tornare al solo ZIP 51 non costituisce un ripristino dei dati dopo nuove variazioni.

## Verifiche eseguite
SQL e operazioni testati su PostgreSQL locale con dati di prova e ruolo anon: migrazione ripetibile, note informative, creazione, correzione, annullamento, catene, conflitti, operazioni atomiche e protezioni dei collegamenti. Verificato anche il passaggio dei dati usando le effettive funzioni JavaScript dell’app.
Testati controlli disponibilità, azioni sull’ultimo collegamento, inclusione dei dati nel backup, sette copie e cambio anno. CSS e sistema di zoom invariati rispetto alla 51. Non effettuata una prova su Safari/iPhone reali né sul database Supabase di produzione.
