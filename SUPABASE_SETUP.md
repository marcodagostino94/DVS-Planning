# Collegamento a Supabase

La Build 3.0 funziona subito in modalità demo locale.  
Per attivare salvataggio condiviso e aggiornamenti in tempo reale:

1. Crea un nuovo progetto su Supabase chiamato `DVS Planning`.
2. Apri **SQL Editor**.
3. Crea una nuova query.
4. Copia tutto il contenuto di `database/schema.sql`.
5. Premi **Run**.
6. In Supabase apri **Project Settings → API**.
7. Copia:
   - Project URL
   - anon public key
8. Apri `config.js` nel repository e inserisci i valori:

```js
window.DVS_SUPABASE = {
  url: "https://TUO-PROGETTO.supabase.co",
  anonKey: "LA-TUA-ANON-KEY"
};
```

9. Salva il file.
10. GitHub Desktop → Commit → Push.
11. Ricarica GitHub Pages.

## Nota di sicurezza

Le policy contenute nella Build 3.0 sono volutamente aperte per il solo prototipo.
Prima dell'uso reale in ufficio aggiungeremo Supabase Auth e policy riservate agli utenti autorizzati.
