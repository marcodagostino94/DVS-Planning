# Planning DVS 51.3

Variazioni UFFICIALI e NON UFFICIALI, selezionabili nella finestra Variazione e Modifica variazione. UFFICIALE è la scelta iniziale.

## Aggiornamento dalla 51.2
1. Chiudere le vecchie app su tutte le postazioni.
2. In Supabase SQL Editor eseguire solo `database/003_variazioni_ufficiali.sql`.
3. Pubblicare il contenuto di questa cartella, con index.html alla radice. Riaprire e verificare 51.3 nelle Informazioni su tutte le postazioni.

Se non è ancora stato eseguito lo script 002 della 51.2, eseguirlo prima del 003. Solo per installazioni precedenti alla 51.1: eseguire nell’ordine 001, 002, 003. Non rieseguire 001 o 002 dopo 003: 001 contiene la precedente funzione Variazione.

## Regole
- UFFICIALE: il Planning mostra la X all’origine e il turno alla destinazione. Lo Schema turni conta la destinazione. Note automatiche SPOSTATO AL / DAL … - VEDI MAIL.
- NON UFFICIALE: il Planning funziona nello stesso modo, ma lo Schema turni conta il turno all’ultima data e fascia oraria ufficiali, una sola volta. Note automatiche SPOSTATO AL / DAL … - NON UFFICIALE.
- Esempio: 10→15 ufficiale, 15→18 non ufficiale: operatività il 18, Schema turni il 15. Vale anche fra mesi o anni diversi. Una nuova variazione ufficiale sposta il conteggio alla nuova destinazione.
- Modifica variazione permette di cambiare la scelta sull’ultimo spostamento della catena, anche lasciando invariati data, sala e orari. Le diciture automatiche di entrambi i turni vengono aggiornate, conservando le altre note entro il limite esistente di 100 caratteri.
- Annulla variazione conserva il comportamento e la conferma di eliminazione della destinazione. Nelle catene si gestisce prima l’ultimo spostamento.
- Il trascinamento fra sale conserva scelta e collegamenti. La disponibilità segue sempre i turni operativi, non quelli con X.
- La classificazione è un campo del database: scrivere o cancellare la nota non cambia lo stato ufficiale, la X o il collegamento.
- Le vecchie note manuali con orari UFFICIAL./UFFICI continuano a essere interpretate nello Schema turni. Le diciture automatiche NON UFFICIALE sono escluse da questa lettura.
- Lo Schema turni resta riservato alla produzione RAI, esclusi i clienti. Gli altri riepiloghi continuano a seguire i turni operativi.

## Turni esistenti
La migrazione imposta tutte le variazioni già collegate come UFFICIALI, senza spostare turni o riscrivere note esistenti. I vecchi casi senza collegamento restano invariati: i due non ufficiali possono essere eliminati e ricreati manualmente con la nuova modalità. Rieseguire 003 non reimposta le nuove variazioni non ufficiali.

## Backup
Backup Agent 2.3.0 invariato: se già installato non occorre reinstallarlo. Il JSON salva già tutte le colonne di shift_variations, quindi include is_official. Gli Excel restano copie del Planning operativo, non dello Schema turni ufficiale.

## Verifiche
Test locali PostgreSQL con permessi anon e calcolo JavaScript: migrazione degli esistenti, ripetibilità, note su entrambi i turni, cambio modalità, catene miste, mesi/anni diversi, annullamento, spostamento sala e protezione da modifiche concorrenti. Controllati sintassi e integrità ZIP. Non sono state effettuate scritture sul database reale né una prova sui dispositivi fisici.
