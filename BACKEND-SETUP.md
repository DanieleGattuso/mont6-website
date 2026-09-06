# Mont°6 — Pagamenti e prenotazioni

## Aggiornamento del 6 settembre 2026

Rilascio tecnico autorizzato dal proprietario. Il 6 settembre sono stati applicati la migrazione D1 additiva e i cinque eventi Stripe elencati sotto; il Worker email aggiornato è attivo al 100% con i binding e il Cron esistenti.
La chiave Stripe e i due feed privati iCal sono stati convertiti in variabili segrete nello stesso progetto Cloudflare, con autorizzazione esplicita e senza modificarne i valori.
Le proposte estetiche restano separate dal repository e non fanno parte di questo rilascio. Il collaudo non esegue addebiti o invii email reali.

### Database esistente

Eseguire nella cartella del sito, dopo avere verificato di selezionare `mont6-bookings`:

```sh
npx wrangler d1 execute mont6-bookings --remote --file=./migrations/0001_payment_safety.sql
```

La migrazione è additiva e ripetibile: crea `checkout_holds`, `booking_cancellations` ed `email_deliveries` senza cancellare le prenotazioni.
Per un database nuovo usare `schema.sql`, che comprende anche queste tabelle.
Il binding `DB` è obbligatorio sulle Pages Functions e sul Worker email. Se manca, i pagamenti si fermano con 503.

### Configurazione Pages

| Nome | Tipo | Uso |
|---|---|---|
| `STRIPE_SECRET_KEY` | Secret | API Stripe; chiave test solo nell'ambiente test |
| `STRIPE_WEBHOOK_SECRET` | Secret | Firma dell'endpoint webhook di quell'ambiente |
| `RESEND_API_KEY` | Secret | Invio conferme e notifiche |
| `BOOKING_FROM_EMAIL` | Variabile | Mittente appartenente a un dominio verificato su Resend |
| `BOOKING_HOST_EMAIL` | Variabile | Indirizzo dell'host |
| `AIRBNB_ICAL_URL` | Secret facoltativo | Feed iCal privato Airbnb |
| `BOOKING_ICAL_URL` | Secret facoltativo | Feed iCal privato Booking.com |

`onboarding@resend.dev` è un mittente di prova con restrizioni sui destinatari: non è una soluzione per inviare conferme a tutti gli ospiti.
Usare un database distinto e credenziali Stripe test nell'ambiente di prova. Non condividere il database reale con le prove.

### Eventi dell'endpoint Stripe

URL: `https://mont6cefalu.it/api/stripe-webhook`

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `charge.refunded`

I nuovi Checkout accettano carte (ed eventuali wallet compatibili configurati in Stripe) e scadono dopo 35 minuti. I metodi differiti delle sessioni precedenti restano gestiti tramite gli eventi asincroni.
Controllare i cinque eventi nel Dashboard: non basta che siano presenti nel codice.

### Ordine di rilascio

1. Applicare la migrazione a D1.
2. Verificare binding, segreti e mittente Resend.
3. Aggiungere gli eventi all'endpoint Stripe e verificare il relativo signing secret.
4. Pubblicare le Pages Functions e gli asset aggiornati; il file `pubblica.bat` non esegue migrazioni D1.
5. Pubblicare anche il Worker email separato, seguendo `EMAIL-AUTOMATION-SETUP.md`.
6. Collaudare in un ambiente Stripe test: carta di prova, annullamento del checkout, sessione scaduta, rimborso, webhook ripetuto ed email.
7. Controllare stato della prenotazione, date nel calendario e tentativi di consegna nel Dashboard Stripe.

Durante il passaggio, vecchie sessioni Stripe possono essere ancora aperte. Non si può impedire retroattivamente che vengano pagate: un conflitto viene rifiutato in fase di registrazione e segnalato all'host. Per un rilascio pulito, attendere o far scadere le vecchie sessioni aperte prima di accettare nuovi checkout.

## Comportamento corretto

- L'importo viene calcolato sul server, notte per notte, in centesimi, a partire da `prezzi.json`.
- Un'istruzione SQL atomica riserva le date prima della creazione del pagamento. Le prenotazioni adiacenti sono consentite.
- La stessa richiesta riprende la stessa sessione. Un errore di rete ambiguo non libera date che potrebbero essere già pagabili.
- Le riserve scadute vengono liberate dopo conferma di Stripe, tramite webhook o riconciliazione al prossimo tentativo per quelle date. L'orologio locale da solo non autorizza a rivenderle.
- La conferma richiede pagamento verificato e prenotazione registrata. La pagina finale non mostra nomi o email e non è memorizzabile in cache.
- Il rimborso totale annulla la prenotazione e libera la riserva, anche se la notifica precede quella del pagamento.
- Il rimborso parziale mantiene le date occupate. Se corrisponde a una cancellazione definitiva con penale, annullare esplicitamente la prenotazione in D1: rimuovere una voce dal JSON non basta.
- Le conferme ospite e host hanno ricevute di invio distinte. Un errore provoca un retry Stripe; Resend riceve una chiave di idempotenza stabile.
- Il calendario iCal esportato risponde 503 in caso di guasto D1; non pubblica un falso calendario vuoto.

## Recupero di una riserva incerta

Query diagnostica (non contiene nomi o email):

```sql
SELECT id, stripe_session_id, check_in, check_out, expires_at, status
FROM checkout_holds
WHERE status = 'active';
```

Se Stripe ha risposto ma il salvataggio dell'ID non è riuscito, lo stesso browser può recuperare la sessione riutilizzando l'ID della richiesta. Il webhook contiene comunque `metadata.holdId`.
Una riserva senza sessione salvata e senza evento può restare bloccata: verificare in Stripe il relativo `holdId` prima di liberarla. Non rilasciare automaticamente le riserve dubbie.

## Limiti operativi da tenere presenti

- Airbnb e Booking.com sincronizzano iCal in modo asincrono: non c'è un blocco atomico condiviso con i portali. Per una garanzia tra canali serve un channel manager. Il blocco atomico implementato copre le prenotazioni dirette del sito.
- I feed devono contenere intervalli giornalieri con inizio e fine validi. Feed corrotti, eventi ricorrenti o formati non supportati fermano il pagamento invece di mostrare una falsa disponibilità.
- Le chiavi di idempotenza Resend durano 24 ore. Le ricevute persistenti in D1 evitano il normale reinvio oltre questa finestra; resta una rara finestra di duplicazione se un invio riesce e il successivo salvataggio fallisce per oltre 24 ore.
- Il checkout è pubblico: proteggere la creazione delle riserve dagli abusi con le regole anti-bot/rate limit di Cloudflare adatte al traffico reale. Queste impostazioni esterne non sono state modificate.
- Sono stati verificati binding, nomi e tipi dei segreti, cinque eventi del webhook e schema D1 in produzione. Il valore del signing secret e la consegna di un pagamento/email reale non sono stati collaudati: i test locali non sostituiscono questo controllo end-to-end.

## Verifiche locali

Node 24 (oppure una versione con `node:sqlite` disponibile):

```sh
npm test
npm run build
```

Per il browser serve Playwright e un browser Chromium. `npm run test:browser` usa `playwright` installato localmente oppure il modulo indicato in `MONT6_PLAYWRIGHT_PATH`. `MONT6_BROWSER_CHANNEL=chrome` usa Chrome già installato.
I test usano dati fittizi e non effettuano richieste a Stripe o Resend reali.

Riferimenti: [Stripe fulfillment](https://docs.stripe.com/checkout/fulfillment), [Stripe webhooks](https://docs.stripe.com/webhooks), [scadenza Checkout](https://docs.stripe.com/api/checkout/sessions/create), [transazioni D1](https://developers.cloudflare.com/d1/worker-api/d1-database/), [idempotenza Resend](https://resend.com/docs/dashboard/emails/idempotency-keys).
