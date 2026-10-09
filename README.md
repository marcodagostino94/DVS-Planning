# DVS Planning v39.3 TEST

Versione di prova delle ottimizzazioni, basata sulla v39.2.
Il primo accesso costruisce la griglia quando viene aperto Planning. Gli accessi successivi riutilizzano la griglia se i dati e le dimensioni sono invariati. Gli aggiornamenti ai turni, anche a parità di numero, invalidano il riutilizzo. I controlli per la griglia riguardano soltanto le date mostrate.

CSS, card, ridimensionamento testi e altezze sono quelli della v39.2.
Non serve nuovo SQL rispetto alla v39.2. Configurazione Supabase conservata; una copia di test con lo stesso database modifica gli stessi dati.

Prova consigliata: aprire ottobre, passare a Dashboard e tornare a Planning; controllare i testi, poi modificare un turno e verificare che il rientro mostri la modifica. Confrontare sullo stesso Mac e allo stesso zoom. Nessuna velocità reale sul Mac è stata misurata in questa verifica.
