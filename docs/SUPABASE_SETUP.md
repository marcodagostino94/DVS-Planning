# Configurazione Supabase — Build 4.0

## 1. Crea le tabelle

In Supabase apri:

`SQL Editor → New query`

Esegui nell'ordine:

1. `database/001_initial_schema.sql`
2. `database/002_seed_rooms.sql`

## 2. Inserisci URL e chiave

Apri `src/config.js` e compila:

```js
window.DVS_SUPABASE = {
  url: "https://TUO-PROGETTO.supabase.co",
  publishableKey: "LA-TUA-PUBLISHABLE-KEY"
};
```

Usa la **Publishable key**, non una secret key.

## 3. Commit e Push

Dopo aver compilato `config.js`:

1. GitHub Desktop
2. Commit to main
3. Push origin
4. Ricarica GitHub Pages

## Modalità locale

Finché URL e chiave restano vuoti, la Build 4.0 funziona con `localStorage`.
Quando configuri Supabase, legge e scrive sulle tabelle online.

## Sicurezza

Le policy SQL della Build 4.0 sono aperte soltanto per il collaudo.
Prima dell'uso aziendale aggiungeremo login e policy riservate agli utenti autorizzati.
