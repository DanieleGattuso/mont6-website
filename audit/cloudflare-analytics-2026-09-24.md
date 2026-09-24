# Baseline Cloudflare Web Analytics — 24 settembre 2026

Acquisizione in sola lettura completata alle **16:04 UTC / 18:04 Europe/Rome**. Nessuna modifica a Cloudflare, DNS, certificati o pagamenti. Le query e le risposte sono conservate in [cloudflare-analytics-2026-09-24.json](cloudflare-analytics-2026-09-24.json), senza token di autenticazione o beacon.

**Conclusione:** il monitoraggio del sito funziona e restituisce dati storici. Le prestazioni osservate sono favorevoli per le metriche disponibili, ma volume basso, campionamento e metriche mancanti impediscono di certificare tutti i Core Web Vitals o attribuire un miglioramento agli interventi di oggi. Non è una misurazione dei posizionamenti SEO o delle citazioni AI.

## Ambito, configurazione e qualità

- Sito: `mont6cefalu.it`, site tag `8e37b1c500e742849c04232ae986be43`, zona `4de75bc5fe6b12a78c181c7f072d5dcf`.
- Web Analytics abilitato, installazione automatica, regola inclusiva host `*` e percorsi `*`, non sospesa. Creazione del sito Analytics: **28 giugno 2026, 11:07:11 UTC**. La prima data con un risultato nella query giornaliera è il 29 giugno; l'ultima è il 22 settembre. Una data assente dal risultato campionato non dimostra assenza di traffico.
- Finestra **28 giorni**: dal **27 agosto 2026 00:00 UTC incluso** al **24 settembre 2026 00:00 UTC escluso**.
- Finestra **90 giorni**: dal **26 giugno 2026 00:00 UTC incluso** allo stesso termine. I primi giorni precedono l'attivazione del sito Analytics: non sono una copertura completa di 90 giorni di esercizio.
- Escluso il giorno corrente per evitare il dato parziale e gran parte delle verifiche tecniche odierne. Il traffico interno precedente non è distinguibile dal pubblico in queste estrazioni.
- Query GraphQL effettuate dopo introspezione dello schema reale: `rumPageloadEventsAdaptiveGroups` e `rumWebVitalsEventsAdaptiveGroups`. I limiti restituiti per entrambi sono: abilitati, massimo intervallo **93 giorni**, storico **184 giorni**, **30 campi**, massimo **10.000 righe**. Le query di dettaglio hanno restituito molte meno di 1.000 righe: nessun taglio dovuto al limite impostato.
- `avg.sampleInterval` pagine: **11,43** sulla finestra 28 giorni, **10,42** sui non-bot della finestra 90 giorni, **10** sui bot. I conteggi riportati sono pertanto **stime espanse**, non un elenco di visite osservate una per una. Cloudflare conserva beacon senza campionamento per sette giorni e aggrega lo storico più vecchio con campionamento; le query possono applicare ulteriore campionamento adattivo. [FAQ Cloudflare](https://developers.cloudflare.com/web-analytics/faq/)
- La metrica `sum.visits` conta caricamenti con referrer non corrispondente al sito: **non equivale a persone uniche o sessioni deduplicate**. La classificazione `bot:0` esclude il traffico riconosciuto come bot, senza garantire che ogni evento rimanente sia umano. [Dimensioni Cloudflare](https://developers.cloudflare.com/web-analytics/data-metrics/dimensions/)

## Traffico

| Metrica stimata | 28 giorni | 90 giorni |
|---|---:|---:|
| Pagine, bot esclusi | 80 | 250 |
| Visite Cloudflare, bot esclusi | 80 | 220 |
| Pagine classificate bot | 0 nel risultato | 80 |
| Visite classificate bot | 0 nel risultato | 70 |
| Pagine totali, bot inclusi | 80 | 330 |
| Pagine desktop, bot esclusi | 50 | 110 |
| Pagine mobile, bot esclusi | 30 | 140 |

Tutti i record restituiti appartengono all'host `mont6cefalu.it`; nessun altro host nella risposta. Non ricavare una percentuale di crescita confrontando direttamente finestre diverse e con così poco campione.

| Pagina | Pagine 28 giorni | Pagine 90 giorni |
|---|---:|---:|
| `/` | 60 | 180 |
| `/en/` | 10 | 60 |
| `/it/` | 10 | 10 |

Paesi osservati, sempre in pagine stimate e senza bot: Italia **40 / 170**, Stati Uniti **20 / 50**, Germania **10 / 20**, Francia **10 / 10** (28 / 90 giorni). Non sono volumi sufficienti per decidere nuove localizzazioni o budget per paese.

## Provenienza e segnali GEO

| Referrer | Pagine 28 giorni | Pagine 90 giorni | Visite 90 giorni |
|---|---:|---:|---:|
| Assente | 60 | 190 | 190 |
| `www.google.com` | 20 | 20 | 20 |
| `mont6cefalu.it` | 0 | 30 | 0 |
| `checkout.stripe.com` | 0 | 10 | 10 |

Un referrer assente comprende accessi diretti e collegamenti che non trasmettono la provenienza; non va etichettato interamente come traffico diretto noto. La provenienza Google non distingue ricerca tradizionale da AI Overviews. Il ritorno da Stripe **non prova un acquisto o una prenotazione confermata**.

Nessun host ChatGPT, Perplexity, Claude o altro motore AI compare nei referrer restituiti. Questo significa solo **nessun referral AI identificabile in questo campione**, non assenza di citazioni o visite originate da AI. Le citazioni senza clic non sono misurabili dal beacon; vanno verificate separatamente.

## Prestazioni reali osservate

Percentile 75 richiesto direttamente al dataset. LCP e TTFB convertiti da microsecondi a secondi, INP da microsecondi a millisecondi. Valori negativi dello schema significano N/A e non sono trasformati in zero. I totali per metrica sono conteggi espansi del dataset RUM, **non numerosità indipendenti del campione**; pageload e Web Vitals sono dataset distinti e i loro conteggi non devono coincidere.

| Periodo e dispositivo | LCP p75 | INP p75 | CLS p75 | TTFB p75 | Totali LCP / INP / CLS |
|---|---:|---:|---:|---:|---:|
| 28 giorni, mobile | 1,432 s | 40 ms | N/D | 0,620 s | 20 / 10 / 0 |
| 28 giorni, desktop | 0,912 s | N/D | 0,008 | 0,611 s | 20 / 0 / 20 |
| 90 giorni, mobile | 0,947 s | 80 ms | N/D | 0,519 s | 100 / 60 / 0 |
| 90 giorni, desktop | 0,696 s | 8 ms | 0,006 | 0,1631 s | 130 / 60 / 130 |

Tutti gli eventi LCP e INP con valore disponibile risultano nella categoria `Good` restituita dall'API. Sui 90 giorni desktop, CLS ha **110 Good e 20 Poor**, con p75 complessivo 0,006; sui 28 giorni desktop risultano 20 Good e nessun Poor. Non c'è un dato CLS mobile utilizzabile, né un INP desktop utilizzabile negli ultimi 28 giorni. Non è dunque corretto dichiarare «Core Web Vitals tutti superati». Questi sono dati Cloudflare, non il dataset CrUX di Google né un esito Search Console. [Metriche Cloudflare](https://developers.cloudflare.com/web-analytics/data-metrics/)

## Vecchio dominio mont6.it: rilevazione delle 16:04 UTC

**Aggiornamento successivo: alle 16:12 UTC delega, certificato e redirect risultano operativi.** Si veda il [report di attivazione](mont6-it-redirect-2026-09-24.md). La rilevazione storica seguente e il JSON originale restano conservati per distinguere la propagazione dall'esito finale.

Controllo finale alle **16:04:29 UTC** del 24 settembre, dopo gli interventi di acquisto e nameserver riferiti dal responsabile dell'attività:

- Zona `12f4cd001ea7147bf1e27637dd23b2bf`: **pending**, `activated_on: null`.
- Nameserver assegnati da Cloudflare: **beth.ns.cloudflare.com**, **sean.ns.cloudflare.com**.
- Endpoint certificati, richiesto con `status=all`: **nessun certificate pack restituito**.
- Resolver pubblico Google: query NS per `mont6.it` e A per `www.mont6.it` entrambe **Status 3 / NXDOMAIN**, senza risposte; SOA `.it` con TTL 1800 al controllo.

La rilevazione non certificava un fallimento del cambio nameserver: rappresentava lo stato visibile durante la propagazione. Il redirect HTTPS non era ancora verificabile alle 16:04 UTC; la verifica successiva delle 16:12 UTC ha confermato l'attivazione e il corretto 301 con percorso e query. Nessuna modifica effettuata da questo audit analitico.

## Baseline da riutilizzare

Conservare questi intervalli come **baseline antecedente agli interventi del 24 settembre**. Il confronto successivo deve usare lo stesso site tag, filtro bot, definizioni e durata. Distinguere sempre traffico da Google, referral AI identificabili e conversioni confermate dal gestionale. Per un verdetto sulle prestazioni raccogliere più osservazioni, in particolare CLS mobile e INP desktop, e confrontarle con Search Console/CrUX e test di laboratorio separati.

Riferimenti API consultati: [GraphQL e limiti](https://developers.cloudflare.com/analytics/graphql-api/limits/), [introspezione](https://developers.cloudflare.com/analytics/graphql-api/features/discovery/introspection/), [limiti effettivi tramite settings](https://developers.cloudflare.com/analytics/graphql-api/features/discovery/settings/), [Web Analytics](https://developers.cloudflare.com/web-analytics/limits/). Le API sono state usate solo con GET o POST GraphQL di lettura, senza mutazioni.
