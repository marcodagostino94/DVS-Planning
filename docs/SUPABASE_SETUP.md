# Supabase — Build 8.0.1

Apri **Supabase → SQL Editor → New query**.

Esegui nell'ordine:

1. `database/003_staff_build_8.sql`
2. `database/004_seed_staff_from_excel.sql`

Il secondo script esegue intenzionalmente `delete from public.staff;` prima dell'importazione: rimuove tutti i dipendenti dimostrativi/test e carica da zero i 206 record dell'Excel.

Attenzione: la cancellazione non elimina i turni. L'eventuale riferimento del turno al dipendente viene impostato a `NULL` dalla foreign key `ON DELETE SET NULL`.

Dopo l'esecuzione:

- apri **Table Editor → staff**;
- verifica che siano presenti 206 record;
- ricarica la pagina del Planning con `⌘⇧R` una sola volta dopo il deploy, così il browser scarica gli asset Build 8.0.1.
