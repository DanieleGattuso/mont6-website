# Revisione Mont°6 — 6 settembre 2026

Rilascio tecnico autorizzato il 6 settembre 2026. Migrazione D1 applicata, cinque eventi Stripe configurati e Worker email pubblicato. Chiave Stripe e feed iCal convertiti in variabili segrete con autorizzazione esplicita. Le proposte estetiche sono esterne al repository e non vengono pubblicate.

## Problemi individuati e correzioni

| Priorità | Problema precedente | Correzione |
|---|---|---|
| Alta | Due ospiti potevano aprire Checkout e pagare le stesse date: nessuna riserva prima dell'incasso. | Riserva atomica in D1, sessione con scadenza, riuso dello stesso tentativo e verifica di sovrapposizioni anche durante la registrazione. |
| Alta | Senza D1 il controllo disponibilità poteva considerare tutte le date libere e accettare pagamenti impossibili da registrare. | Checkout bloccato se DB, firma webhook, tariffe o calendari non sono disponibili. |
| Alta | Un guasto D1 produceva un feed iCal vuoto con HTTP 200, interpretabile dai portali come date libere. | Risposta 503 e nessun calendario falsamente vuoto. |
| Alta | Il middleware poteva richiamare `next()` dopo il fallimento di una funzione di pagamento. | La richiesta downstream viene eseguita una sola volta. |
| Media | Aprendo `success.html` si vedeva una conferma senza alcuna verifica. | Stato verificato sul server contro Stripe e D1; gestione di attesa, errori, annullamenti e link non validi. |
| Media | Date impossibili/passate e valori come `2test` venivano accettati; nessun confronto con il preventivo visualizzato. | Parsing rigoroso, notti UTC, ospiti interi, importi in centesimi e confronto con il preventivo del browser. |
| Media | Webhook ripetuti potevano duplicare email; un invio fallito poteva ricevere HTTP 200 e perdere il retry. | Ricevute distinte ospite/host, idempotenza Resend e 503 quando l'elaborazione non è completa. |
| Media | Mancavano eventi di pagamento differito e gestione robusta dell'ordine rimborso/conferma. | Eventi asincroni supportati; cancellazione persistente anche quando il rimborso arriva per primo. |
| Media | Feed iCal corrotti potevano sembrare calendari vuoti. | Validazione del feed, date reali, esclusione eventi annullati e arresto del checkout per formati non supportati. |
| Media | Il nome dell'ospite entrava senza escaping nelle email automatiche; la chiave del test Cron era nell'URL. | Escaping HTML, link HTTPS verificati, test Cron con POST e Authorization header. |
| Media | Il pre-arrivo saltava prenotazioni dell'ultimo momento e run falliti. | Recupero delle email per arrivi da oggi a due giorni, nel fuso di Roma. |
| Bassa | Ritorno dal checkout con pulsante disabilitato; errori di disponibilità non sempre visibili. | Ripristino del tentativo, aggiornamento al ritorno dalla cache del browser e messaggi espliciti. |
| Bassa | Banner cookie che poteva riapparire dopo la chiusura; overlay della galleria che intercettava i clic. | Timer annullato, storage gestito anche se disabilitato e overlay senza intercettazione del puntatore. |
| Bassa | Lo script di pubblicazione mostrava successo anche dopo errori Git. | Test prima dell'invio, verifica degli errori e messaggio che richiede di controllare l'esito del deploy Cloudflare. |
| Media | La mappa mostrava “API key required” perché CARTO richiede ora una chiave. | Ripristinate le mappe con il servizio standard OpenStreetMap, attribuzione collegata e CSP aggiornata. |

## Verifiche

- 27 test offline dei pagamenti, delle email e del middleware: superati. Le query vengono eseguite su SQLite reale; Stripe e Resend sono simulati e non ricevono chiamate.
- 48 controlli browser su italiano/inglese, desktop/mobile: superati. Coprono selezione date, intervalli tra prenotazioni, prezzi, ripetizione del tentativo, guasti e pagina di conferma.
- 26 controlli del reindirizzamento lingua: superati dopo l'integrazione degli aggiornamenti remoti.
- Build della versione inglese: 24 controlli superati.
- Anteprima visuale controllata a 1440 e 390 pixel: nessuna eccezione JavaScript, immagine rotta o overflow orizzontale nei controlli effettuati. Il rilevatore CSS ha lavorato in modalità ridotta; non costituisce una certificazione di accessibilità.

## Prima della pubblicazione

Seguire **BACKEND-SETUP.md** per i rilasci successivi. La migrazione D1 e la configurazione dei cinque eventi Stripe sono state completate; l'ID reale del database è inserito nel Worker. Le modifiche remote a URL e selettore lingua sono integrate nel rilascio.

Binding, presenza dei segreti, endpoint, eventi e schema remoto sono stati verificati. La consegna end-to-end di pagamenti ed email reali non è stata collaudata. Nessuna prenotazione esistente è stata modificata.

Il blocco atomico protegge le prenotazioni dirette. La disponibilità proveniente da Airbnb/Booking resta soggetta al ritardo iCal; una garanzia atomica tra portali richiede un'integrazione di channel management. Una riserva con risposta Stripe incerta resta occupata fino alla verifica, anziché rischiare una seconda vendita. Gestione dei casi incerti e protezione anti-abuso sono descritte nella guida backend.

Fonti tecniche consultate: [Stripe fulfillment](https://docs.stripe.com/checkout/fulfillment), [Stripe webhook](https://docs.stripe.com/webhooks), [Checkout e scadenze](https://docs.stripe.com/api/checkout/sessions/create), [transazioni D1](https://developers.cloudflare.com/d1/worker-api/d1-database/), [idempotenza Resend](https://resend.com/docs/dashboard/emails/idempotency-keys).
