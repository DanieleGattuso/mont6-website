# Mont°6 — Email automatiche

Il Worker è separato dal sito: va pubblicato a parte, dopo la migrazione descritta in `BACKEND-SETUP.md`.
Usa le tabelle `bookings`, `checkout_holds` ed `email_deliveries` nello stesso database D1 delle Pages Functions.

## Configurazione

In `worker-emails/wrangler.toml`, sostituire `INSERISCI_QUI_IL_DATABASE_ID` con l'ID verificato di `mont6-bookings`. Il segnaposto non è un ID valido e impedisce il deploy.
Configurare il binding `DB`, il secret `RESEND_API_KEY`, il mittente verificato `BOOKING_FROM_EMAIL` e, facoltativamente, un link HTTPS `REVIEW_URL` e il secret `CRON_TEST_KEY`.

Dalla cartella `worker-emails`:

```sh
npx wrangler secret put RESEND_API_KEY
npx wrangler deploy
```

Usare il deploy dal repository: il Worker importa funzioni di data da `functions/_lib/payment.js`. Incollare il solo file `worker.js` nell'editor della dashboard non include il modulo importato.
Il Cron definito nel file di configurazione esegue il Worker alle 09:07 UTC.

## Comportamento

- Pre-arrivo: ospiti in arrivo da oggi a due giorni, comprese prenotazioni dell'ultimo momento e invii da recuperare dopo un guasto.
- Recensione: soggiorni conclusi con email ancora da inviare.
- Giorni calcolati nel fuso `Europe/Rome`.
- Testi in italiano o inglese secondo il checkout (italiano per le prenotazioni precedenti senza lingua).
- I nomi degli ospiti vengono convertiti in testo sicuro prima di essere inclusi nelle email.
- Le ricevute persistenti e le chiavi di idempotenza limitano i duplicati. Un errore segnala il fallimento del Cron; il prossimo run ritenta gli invii mancanti.

## Test manuale

Il test esegue davvero gli invii delle prenotazioni eleggibili: usare un ambiente di prova con destinatari controllati.
Inviare una richiesta **POST** all'URL del Worker con header `Authorization: Bearer <CRON_TEST_KEY>`. Il precedente parametro `?key=` non avvia più gli invii e non deve essere usato: esponeva il secret nella cronologia e nei log.
Non modificare le date di prenotazioni reali per provare il Cron.

I test offline del repository controllano anche i template e non inviano email.
