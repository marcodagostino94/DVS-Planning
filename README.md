# Planning DVS 51.5 — Backup Agent 2.4.0

## Installazione dell’aggiornamento
1. Pubblicare il contenuto di questa cartella con index.html alla radice.
2. Nell’app aggiornata aprire Backup e scaricare il nuovo Backup Agent 2.4.0.
3. Sul Mac autorizzato, attendere che un eventuale backup in corso termini ed eseguire l’installazione sopra la versione precedente. Cartella scelta, configurazione e stato vengono mantenuti.
4. Eseguire un backup manuale dall’utility del Backup Agent e controllare i nuovi Excel. Non serve spostare o cancellare le copie precedenti.

Nessun nuovo SQL. Se è già installata e configurata la 51.4, non ripetere le migrazioni. Gli script database 001–003 sono conservati per installazioni precedenti: valgono le istruzioni delle rispettive versioni.

## Nuovo Excel
Il file viene costruito dal programma: il vecchio template vuoto non viene più letto.
Ogni Excel contiene 12 fogli, Gennaio–Dicembre. Le settimane lunedì–domenica appartengono al mese del giovedì, come nell’app. Possono quindi essere visibili giorni dell’anno precedente o successivo. Novembre 2026 comprende 2–29 novembre; 30 novembre apre Dicembre. Il programma legge tutti i turni necessari anche ai bordi dell’anno.

Un turno occupa due celle verticali: dettagli e montatore. Per spostarlo selezionare entrambe e usare Taglia/Incolla in una coppia di celle vuote. I contenuti sono modificabili e non protetti. Le modifiche Excel non aggiornano l’app e saranno assenti dai nuovi backup, che leggono di nuovo il database. Note e collegamenti dentro Excel sono informativi, senza automazioni di variazione.

Contenuti: produzione in grassetto; programma in stampatello e grassetto; orario compatto (minuti quando necessari); lavorazione in grassetto, EDIT nero e GRAFICA/COLOR/SOUND rossi; VARIABILE e DOPPIA POSTAZIONE rossi; note complete. Montatore sotto in N. COGNOME, stampatello e grassetto. Se assente, cella vuota; CLIENTE quando previsto.

I colori derivano dal color_key di ogni turno, con le stesse corrispondenze dell’app. Le sfumature web sono rese come riempimenti Excel uniformi; Grafica/Color/Sound sono più saturi. I provvisori sono senza riempimento. I turni originali con X sono riconoscibili dallo sfondo rosso e dalla dicitura X SPOSTATO, anche se provvisori. Le destinazioni attive conservano il proprio colore.

Nomi sale grandi e uniti verticalmente. Riga separatrice con il nome della sala che segue ripetuto lungo il mese. Linea verticale spessa tra domenica e lunedì. Intestazioni e colonna sale bloccate. Ogni sala ha tante coppie di righe quanti sono i turni nel suo giorno più pieno del mese, senza accorpare o eliminare turni.

Sale 1–10, Sale 1A–5A, Remoto 1–3: corrispondenza diretta con i codici dell’app. Nessun abbinamento per somiglianza dei nomi o ordine delle righe. La fonte è la tabella shifts, insieme alla rubrica staff; la vecchia vista planning_export non decide più cosa appare nell’Excel. Una sala sconosciuta provoca un errore esplicito, senza pubblicare un backup incompleto.

I blocchi sala sono esclusi dagli Excel, ma restano nel JSON. Lo Schema turni ufficiale non è rappresentato: l’Excel è il Planning operativo, comprese le origini con X e le destinazioni delle variazioni ufficiali e non ufficiali.

## Regole di conservazione invariate
Ogni copia contiene Planning_ANNO.xlsx, Planning_ANNO_SUCCESSIVO.xlsx e il JSON dei dati, con controllo integrità. Sono mantenute le ultime sette copie complete nella cartella dell’anno in corso, indipendentemente dal giorno della settimana. Al cambio anno viene aperta la nuova cartella annuale; quella precedente non viene svuotata. Un errore nella generazione del secondo Excel non pubblica una copia parziale e non elimina copie precedenti.

Il JSON conserva i dati applicativi e i collegamenti delle variazioni. Orario automatico, autorizzazione del Mac, semaforo 24 ore e notifiche di stato restano quelli esistenti.

## Verifica
Controlli locali sull’export e sulla conservazione. Installazione e avvio del servizio macOS da verificare sul Mac autorizzato con il primo backup manuale. Nessuna scrittura sul database reale effettuata durante lo sviluppo.
