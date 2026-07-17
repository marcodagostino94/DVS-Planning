# DVS Planning — Build 9.0

## Ordine di installazione

1. Conservare il proprio `src/config.js` già compilato con URL base Supabase e Publishable Key.
2. In Supabase eseguire `database/005_complete_database_build_9.sql`.
3. Verificare che la query termini con `Success`.
4. Pubblicare i file della Build 9.0 con commit e push.
5. Ricaricare GitHub Pages con `⌘ + ⇧ + R`.

## Importante

La migrazione 005 preserva la tabella `staff` e i dipendenti già importati. Crea le restanti tabelle del Planning. Da questa build in poi il database dovrà essere aggiornato soltanto tramite nuove migrazioni incrementali.

La tabella `shifts` diventa la fonte ufficiale dei turni. Se è vuota, il Planning partirà senza turni e i nuovi turni creati dall'app verranno salvati direttamente in Supabase.
