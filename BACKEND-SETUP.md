# Mont°6 — Pagamenti e prenotazioni

## Aggiornamento sicurezza del 22 settembre 2026

La build `npm run build` produce ora `dist/`, che è l'unica directory di pubblicazione di Cloudflare Pages. `functions/` resta nella root del repository: viene compilata come codice server, non copiata tra i file pubblici. Documentazione, schema, migrazioni, strumenti e Worker email non devono essere serviti come asset.

Configurazione di produzione aggiuntiva, preservando tutti i segreti e i binding esistenti:

| Nome | Tipo | Valore |
|---|---|---|
| `BOOKING_ORIGIN` | Variabile ordinaria | `https://mont6cefalu.it` |
| `REQUIRED_ICAL_SOURCES` | Variabile ordinaria | `airbnb,booking` |

La prima impedisce nuovi checkout dagli alias Pages, sui quali le regole del dominio non si applicano. I webhook Stripe restano raggiungibili. La seconda impedisce di accettare pagamenti quando manca uno dei feed richiesti. Non condividere i segreti di produzione con gli ambienti di anteprima.

Sulla zona Cloudflare sono attivi HTTPS obbligatorio, TLS minimo 1.2 e una regola che blocca per 10 secondi le richieste al percorso `/api/create-checkout-session` dopo 5 richieste in 10 secondi per IP e centro dati Cloudflare. La regola non include i webhook. È una protezione dai picchi ripetuti, non una garanzia contro bot distribuiti o richieste lente: verificarne l'effetto sul traffico reale prima di ulteriori restrizioni.

Le Functions aggiungono gli header di sicurezza anche a risposte API, errori e redirect. I corpi delle richieste sono limitati in streaming: checkout 4 KiB, webhook e ciascun feed iCal 1 MiB. Le preferenze di lingua usano cookie `Secure`. Sharp è aggiornato alla versione 0.35.4.

Prima di pubblicare questa versione, verificare `PRAGMA table_info(checkout_holds)` e applicare `migrations/0002_booking_terms.sql` solamente se manca `terms_version`. È una colonna facoltativa: le riserve precedenti mantengono `NULL` e gli stessi parametri Stripe. Per database nuovi, `schema.sql` la comprende già. La versione `2026-09-22` delle condizioni, confermata dal proprietario, viene salvata nelle nuove riserve, mostrata in Stripe e riportata nelle nuove conferme ospite. Conservare immutabili le versioni già pubblicate in `functions/_lib/booking-terms.js`.

La revisione non esegue addebiti o invii email reali. Il recupero automatico di riserve con esito Stripe incerto resta volutamente conservativo; consultare la procedura più sotto. L'autenticazione a due fattori dell'account Cloudflare risultava disattivata nel controllo API e richiede l'intervento del titolare.

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
| `AIRBNB_ICAL_URL` | Secret | Feed iCal privato Airbnb, richiesto in questa produzione |
| `BOOKING_ICAL_URL` | Secret | Feed iCal privato Booking.com, richiesto in questa produzione |

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
- Il checkout è pubblico: il 22 settembre è stata attivata la regola di limitazione descritta sopra. Restano possibili abusi distribuiti; non è stato aggiunto un CAPTCHA né un limite commerciale alla durata massima dei soggiorni.
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
