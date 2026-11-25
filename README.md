# Planning DVS 51.2

Permette di trascinare fra sale sia il turno con la X sia il turno attivo nato da una variazione, mantenendo i collegamenti. Data e orario restano invariati. Il cambio giorno dei turni collegati continua a passare da Modifica variazione o Variazione.

## Aggiornamento dalla 51.1
1. In Supabase SQL Editor eseguire SOLO `database/002_spostamento_sale.sql`. Non ripetere la migrazione delle vecchie X. Il nuovo script aggiunge la funzione di spostamento, senza modificare i turni esistenti; attiva esplicitamente RLS sulla tabella tecnica delle migrazioni.
2. Pubblicare il contenuto di questa cartella con index.html alla radice, ricaricare l’app e verificare 51.2 nelle Informazioni.
3. Provare lo spostamento tra sale di una X e del suo turno attivo. Il collegamento e le note devono restare invariati. Se la sala è occupata, solo il turno attivo viene bloccato.

Per una prima installazione proveniente dalla 51 o precedente: eseguire prima `database/001_variazioni.sql`, poi `database/002_spostamento_sale.sql`, a vecchie app chiuse e dopo un backup. La migrazione iniziale conserva le vecchie X senza abbinare automaticamente le destinazioni.

## Comportamento
- Trascinare una X cambia solo la sua sala: resta inattiva, non occupa disponibilità e non entra nei conteggi. Il turno attivo resta dov’è.
- Trascinare il turno attivo cambia solo la sua sala, se libera nell’orario previsto. La X resta dov’è.
- Non vengono creati nuovi turni o nuove X. I collegamenti vengono aggiornati anche se il turno è intermedio in una catena.
- Annulla variazione ripristina il turno originale nella sala attuale della X, dopo il controllo disponibilità, ed elimina la destinazione con conferma esplicita.
- Sono supportati anche trascinamenti multipli tra sale: se un turno attivo ha un conflitto, nessun turno del gruppo viene spostato.
- I turni confermati restano bloccati. Taglia/incolla dei turni collegati resta protetto; questa modifica riguarda il trascinamento.
- Le operazioni collegate sono atomiche. Lo storico Annulla/Ripristina generico viene azzerato dopo questi spostamenti: per correggere la sala trascinare nuovamente il turno.

## Backup e grafica
Backup Agent 2.3.0 identico a quello della 51.1: se già installato, non reinstallarlo. Grafica, zoom, note informative e conteggi della 51.1 mantenuti.

## Verifica
Test PostgreSQL locale con ruolo anon: X in sala occupata, conflitto sul turno attivo, aggiornamento di entrambi i collegamenti di un turno intermedio, annullamento nella nuova sala, rifiuto di dati obsoleti e atomicità dei gruppi. Verificati JavaScript e integrità del pacchetto. Nessuna modifica eseguita sul database reale; resta la prova su Mac/iPad.
