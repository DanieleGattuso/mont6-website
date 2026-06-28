# Mont°6 — Setup backend automazioni (Cloudflare)

Guida per attivare: **webhook Stripe → database D1 → blocco date automatico → email**.
Tutti i passi sono lato dashboard/CLI: il codice è già nel repo.

## 1. Crea il database D1

Dal tuo computer (una volta sola), con Node installato:

```bash
npm install -g wrangler          # se non l'hai
wrangler login
wrangler d1 create mont6-bookings
wrangler d1 execute mont6-bookings --remote --file=./schema.sql
```

L'ultimo comando crea la tabella `bookings`.

## 2. Collega il database alle Functions (binding)

Cloudflare → **Workers & Pages → mont6-website → Settings → Functions → D1 database bindings → Add binding**
- **Variable name:** `DB`
- **D1 database:** `mont6-bookings`
- Salva (vale sia per Production che Preview).

## 3. Aggiungi le variabili/segreti

Cloudflare → **mont6-website → Settings → Variables and Secrets** (ambiente **Production**):

| Nome | Tipo | Valore |
|---|---|---|
| `STRIPE_SECRET_KEY` | Secret | (già presente) `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | Secret | `whsec_…` (vedi passo 4) |
| `RESEND_API_KEY` | Secret | `re_…` (dal tuo account Resend) |
| `BOOKING_FROM_EMAIL` | Plaintext | `prenotazioni@mont6cefalu.it` *(o `onboarding@resend.dev` per partire subito)* |
| `BOOKING_HOST_EMAIL` | Plaintext | l'email dove vuoi ricevere le notifiche |

## 4. Crea il webhook su Stripe

Stripe Dashboard → **Developers → Webhooks → Add endpoint**
- **Endpoint URL:** `https://mont6cefalu.it/api/stripe-webhook`
- **Eventi:** seleziona `checkout.session.completed`
- Crea, poi copia il **Signing secret** (`whsec_…`) → mettilo in `STRIPE_WEBHOOK_SECRET` (passo 3).

## 5. (Email professionale) Verifica il dominio su Resend

Per inviare da `prenotazioni@mont6cefalu.it`:
Resend → **Domains → Add domain → mont6cefalu.it** → aggiungi i record DNS indicati su Cloudflare (DNS della zona mont6cefalu.it). A verifica completata, usa quell'indirizzo in `BOOKING_FROM_EMAIL`.
*(Se vuoi partire subito senza verifica, usa `onboarding@resend.dev` — funziona ma come mittente è meno elegante.)*

## 6. Redeploy

Dopo aver aggiunto binding e variabili: **Deployments → ultimo deploy → `…` → Retry deployment** (le variabili/binding si applicano solo ai deploy nuovi).

## Come testare

1. Fai una prenotazione di prova (con chiave Stripe in **test mode** se preferisci non addebitare).
2. Verifica: arriva l'email di conferma all'ospite + la notifica a te.
3. Ricarica il sito: quelle date risultano **sbarrate** nel calendario (lette da D1).
4. Controlla i dati salvati: `wrangler d1 execute mont6-bookings --remote --command "SELECT * FROM bookings"`.

---

### Note tecniche
- La firma del webhook è verificata con Web Crypto (no dipendenze).
- L'inserimento è **idempotente** (UNIQUE su `stripe_session_id`): Stripe può ritentare senza creare duplicati.
- Se il binding `DB` non è configurato, le Functions continuano a funzionare (degradano sul file statico `blocked-dates.json`), quindi il sito non si rompe mai durante il setup.
