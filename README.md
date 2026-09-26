# DVS Planning v39.1 — Definitiva

Pacchetto di aggiornamento dell’app esistente, basato sulla v38 approvata.

## Pubblicazione
1. Verificare che src/config.js punti al progetto Supabase destinato a tutti gli utenti.
2. Se la migrazione 014 è già stata eseguita su quel progetto, non serve altro SQL. Altrimenti eseguire database/014_variable_request_id_v37.sql una sola volta prima di aggiornare il sito. Aggiunge soltanto il campo facoltativo request_id alla tabella shifts.
3. Pubblicare index.html, src, assets, downloads, favicon.ico e manifest.webmanifest mantenendo la struttura delle cartelle.
4. Ricaricare l’app. In Informazioni e nel menu deve comparire v39.1.

La preparazione dello ZIP non pubblica il sito e non esegue modifiche al database.

## Funzioni
- Variabili: elenco mensile, ID richiesta facoltativo, totali per programma e stato con semaforo. Colonne allineate ed elenco scorrevole.
- Schema turni: soltanto produzione RAI (ignora maiuscole/minuscole e spazi esterni), con uno spazio per programma e tabelle per lavorazione. ASSISTENTE confluisce in EDIT.
- Una cella per turno; righe distinte per orario iniziale e standard/variabile. Provvisori arancioni, inclusi nei totali. Esclusi CLIENTE e originali barrati, incluse le destinazioni degli spostamenti.
- Note UFFICI..., UFFICIAL., UFFICIALMENTE con intervalli come 10-18 o dalle 10 alle 18: orario ufficiale utilizzato solo nello schema, senza modificare la data o il Planning. Note ambigue segnalate e non conteggiate nei totali, dichiarati parziali.
- Ore decimali: 7,5 = 7 ore e 30 minuti. Doppia postazione non raddoppia le ore.

Conservati icone, logo e installer Backup Agent, collegato nell’app. Rimossi changelog intermedi, istruzioni di test e SQL storici/seed non necessari all’aggiornamento. Questo pacchetto non serve per creare da zero un nuovo database.
