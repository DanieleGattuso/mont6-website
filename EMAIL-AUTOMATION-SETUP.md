# Mont°6 — Setup email automatiche (pre-arrivo + recensione)

Attiva il Worker `worker-emails/worker.js` che ogni giorno invia, da solo:
- l'email **pre-arrivo** ~2 giorni prima del check-in;
- la richiesta di **recensione** dopo il check-out.

Usa lo **stesso database D1** (`mont6-bookings`) già creato. Scegli UNA delle due strade.

---

## Strada A — Dalla dashboard (consigliata, a click)

1. **Crea il Worker**
   Cloudflare → **Workers & Pages** → **Create** → **Worker** → nome `mont6-email-cron` → **Deploy**.

2. **Incolla il codice**
   Apri il Worker → **Edit code** → cancella tutto e incolla il contenuto di `worker-emails/worker.js` → **Deploy**.

3. **Collega il database**
   Worker → **Settings** → **Bindings** → **Add → D1 database**:
   - Variable name: `DB`
   - Database: `mont6-bookings`

4. **Aggiungi le variabili**
   Worker → **Settings** → **Variables and Secrets**:
   | Nome | Tipo | Valore |
   |---|---|---|
   | `RESEND_API_KEY` | Secret | la tua `re_…` |
   | `BOOKING_FROM_EMAIL` | Plaintext | `prenotazioni@mont6cefalu.it` |
   | `REVIEW_URL` *(opzionale)* | Plaintext | link recensione (es. la tua pagina Airbnb/Google) |
   | `CRON_TEST_KEY` *(opzionale)* | Secret | una parola a caso, per il test manuale |

5. **Imposta il Cron**
   Worker → **Settings** → **Triggers** → **Cron Triggers** → **Add** → `7 9 * * *` (ogni giorno alle 09:07 UTC).

6. **Deploy** di nuovo per applicare tutto.

---

## Strada B — Da terminale (wrangler)

```bash
cd worker-emails
wrangler d1 list                       # copia l'ID di mont6-bookings
# incolla l'ID in wrangler.toml (campo database_id)
wrangler secret put RESEND_API_KEY     # incolla la chiave quando richiesto
wrangler deploy
```

---

## Come testare subito (senza aspettare il cron)
1. Aggiungi la variabile `CRON_TEST_KEY` (Secret) con un valore a tua scelta.
2. Visita: `https://mont6-email-cron.<tuo-sottodominio>.workers.dev/?key=IL_TUO_VALORE`
3. Risponde con `{"prearrival":N,"reviews":N}` ed esegue subito l'invio per le prenotazioni che rientrano nelle date.

> Suggerimento per un test reale: nel database imposta temporaneamente su una prenotazione un `check_in` tra 2 giorni (e `sent_prearrival_at` a NULL), poi lancia il test.

---

### Note
- Ogni email parte **una sola volta** (le colonne `sent_prearrival_at` / `sent_review_at` vengono valorizzate dopo l'invio).
- Il Worker è separato dal sito: non influisce sul deploy di Cloudflare Pages.
- I testi delle email sono in `worker-emails/worker.js` (funzioni `prearrivalHtml` e `reviewHtml`): personalizzabili quando vuoi.
