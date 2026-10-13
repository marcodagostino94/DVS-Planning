# DVS Planning v41

Base: v40 (derivata dalla v39.3 TEST). Nessun intervento della v39.4; algoritmi di zoom e adattamento testi conservati.

## Aggiornamento
1. Chiudere le vecchie sessioni dell’app durante l’aggiornamento.
2. Nel SQL Editor Supabase eseguire database/015_v41_blocchi_e_colori.sql. È una transazione: se fallisce, non proseguire con la pubblicazione e conservare il messaggio di errore.
3. Pubblicare il contenuto della cartella DVS-Planning_v41 sul sito di test, quindi ricaricare l’app. Configurazione Supabase invariata: un sito di test con questa configurazione opera sugli stessi dati.
4. Provare la v41 prima di distribuirla agli altri utenti.

Non eseguire RIPRISTINO_COLORI_solo_se_necessario.sql durante l’installazione.
014_variable_request_id_v37.sql è conservato solo per chi non ha già la colonna request_id.

## Funzioni
- Blocchi sala: tasto destro sulla cella > Aggiungi blocco sala. Nota libera, data, sala, intera giornata oppure orari. Rosso acceso #FF4055 e scritte nere. Clic sul blocco per modificarlo, spostarlo cambiando data/sala o eliminarlo.
- Blocco e turni possono coesistere. Avviso superabile in inserimento, modifica, trascinamento, incolla e variazione. I blocchi non entrano in ore, riepiloghi, Variabili o Schema turni; sono inclusi nella stampa del Planning.
- Finestra turno: Sala/Lavorazione, Stato, quadratini colori, Dipendente. Provvisorio disattiva i colori. Note resta accanto a Variabile; i campi ID richiesta e Nota seguono sotto.
- Palette: Giallo, Blu, Verde, Viola, Azzurro, Arancione, Rosa.
- Conversione: Indaco e Rosso > Viola; Lime > Verde; Petrolio > Azzurro; Corallo > Arancione. Ambra usa la stessa chiave tecnica amber e diventa Giallo nell’app, senza aggiornare quel campo nel database.
- Modifica multipla: stessa voce del menu, abilitata per turni non confermati con stessa produzione, programma e colore. Selezionare i campi da applicare. Data/orari/sala non modificabili; note invariate, aggiunte o sostituite con protezione SPOSTATO AL/DAL. Se le note superano 100 caratteri il salvataggio viene fermato senza tagliarle. ID richiesta facoltativo; rendendo definitivi i variabili viene richiesto per ciascun turno.

## Database e ripristino
I blocchi sono nella nuova tabella room_blocks, con Realtime e policy replicate da shifts. Se le policy esistenti dipendono da colonne specifiche dei turni, lo SQL si interrompe: occorre adattarle prima di procedere, senza allargare i permessi.
Il backup dei colori originali è nella tabella protetta planning_color_backup_v41. Lo script di ripristino aggiorna solo turni ancora nel colore assegnato dalla migrazione; per rivedere le vecchie tonalità usare anche il codice v40. Non cancellare la tabella di sicurezza.
L’installer Backup Agent è quello esistente e non è stato modificato: non è verificato che il backup automatico includa room_blocks. Includere questa tabella nelle esportazioni del database per salvare anche i blocchi.

## Verifiche eseguite
Sintassi JavaScript, corrispondenza risorse locali, ordine campi, logica modifica multipla, conservazione campi, note protette, sovrapposizioni e ordinamento blocchi, identità degli algoritmi zoom rispetto alla v40.
Nessuna modifica eseguita sul database online. SQL non eseguito su Supabase; nessun test grafico in un browser reale disponibile in questo ambiente.
