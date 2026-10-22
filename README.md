# DVS Planning v43.2

Versione da provare sul sito di test prima della pubblicazione. Base: v42 definitiva.

## Installazione
Sostituire i file del sito con il contenuto della cartella DVS-Planning_v43.2. Nessuno SQL da eseguire.

## Visualizzazione mensile
Ogni settimana completa, da lunedì a domenica, compare una sola volta: nel mese del giovedì, che contiene almeno quattro giorni della settimana. Vale anche tra dicembre e gennaio.
I giorni degli altri mesi hanno lo sfondo normale (restano evidenziati weekend e festivi) e il mese abbreviato in grassetto accanto al numero.
Oggi e apertura Planning scelgono il mese che contiene la settimana odierna: a cavallo del mese il titolo può quindi indicare il mese adiacente.

## Funzioni conservate
Nessuna modifica a date, dati, riepiloghi, Variabili, Schema turni o Centro Stampa. Zoom, intestazioni fisse e card restano quelli della v42.

## Verifica
Controllati sintassi JavaScript, continuità e unicità delle settimane, anni bisestili e cambio anno. Verifica grafica Safari/Chrome da effettuare sul Mac.

## Correzione v43.2
Triangolino su tutti i turni dello stesso montatore nella stessa giornata, anche con orari consecutivi o separati. Il controllo è un avviso e non impedisce l’assegnazione. Nessuna modifica SQL.

## Festivi v43.2
Colonna festiva rosata più intensa rispetto al weekend; giorno, numero e mese esterno in rosso. Inclusi il 29 giugno a Roma, Pasqua e Pasquetta calcolate ogni anno. Lo stile festivo prevale sul weekend.
Controllata la logica delle date e la sintassi; resa grafica da verificare sul Mac. Nessuno SQL.
