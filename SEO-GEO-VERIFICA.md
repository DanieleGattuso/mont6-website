# Verifica SEO, GEO e accessibilità — 24 settembre 2026

Il sito ha una base tecnica solida e Search Console conferma l'indicizzazione delle home italiana e inglese, una sitemap riuscita e 2 elementi VacationRental validi senza errori. Il report AI di Google mostra anche 2 impressioni, su un campione minimo precedente all'upgrade. Il vecchio dominio mont6.it è stato recuperato dal proprietario e ora reindirizza correttamente con 301 e HTTPS al sito ufficiale. I volumi di ricerca osservati restano contenuti: il test Lighthouse SEO riguarda requisiti tecnici di base, non posizioni o probabilità di citazione AI.

## Controlli sul sito pubblico

| Area | Evidenza |
| --- | --- |
| Collegamenti e asset | 81 URL pubblici controllati, tutti HTTP 200; immagini con contenuto corretto, nessun fallback HTML inatteso |
| Routing | `/index.html` e `/en/index.html` rispondono con 308; URL inesistenti restituiscono veri 404 IT/EN |
| Lingue e duplicati | Canonical e hreflang coerenti su home/privacy; `/it/` è un alias canonizzato alla home italiana |
| Contenuti | HTML completo IT/EN, un H1 e un main nella home, nessun collegamento interno o anchor rotto |
| Schema | JSON-LD valido, identità stabile dell'appartamento; otto FAQ generate dal testo visibile per ogni lingua |
| AI crawler | robots consente i bot richiesti; precedente verifica live dei dieci user-agent HTTP 200; Cloudflare non applica il blocco AI globale |
| Contenuti riservati | API disallow; pagine esito noindex; report, sorgenti e test esclusi da dist |

## Misurazione iniziale Google PageSpeed Insights

[Report pubblico del 24/09/2026 alle 17:02 CEST](https://pagespeed.web.dev/analysis/https-mont6cefalu-it/96q67klrj2?form_factor=mobile), Lighthouse 13.5.0, prima delle correzioni di questo audit.

| Metrica | Mobile, Moto G Power e 4G lenta simulati | Desktop simulato |
| --- | ---: | ---: |
| Prestazioni | 87 | 100 |
| Accessibilità automatica | 97 | 97 |
| Best practice | 100 | 100 |
| SEO tecnico Lighthouse | 92 | 92 |
| FCP | 2,4 s | 0,5 s |
| LCP | 3,2 s | 0,8 s |
| TBT | 50 ms | 0 ms |
| CLS | 0 | 0,009 |
| Speed Index | 4,6 s | 0,7 s |

Nessun dato CrUX disponibile nel report: non è possibile dichiarare superati i Core Web Vitals degli utenti reali. TBT è una misura di laboratorio, non INP. Il riferimento di buona qualità LCP è 2,5 secondi al 75° percentile degli utenti reali. Fonti: [Web Vitals](https://web.dev/articles/vitals), [PageSpeed Insights](https://developers.google.com/speed/docs/insights/v5/about).

Il CSS home blocca il primo rendering; Google stima 780 ms di risparmio nel test mobile. Le immagini secondarie hanno circa 55 KiB di riduzione potenziale. Sono opportunità ulteriori, non stime di miglioramento garantito. Il titolo hero risulta elemento LCP. Una successiva ottimizzazione del CSS critico va misurata senza introdurre contenuto non stilizzato o regressioni nel calendario.

L'API PageSpeed senza chiave ha restituito HTTP 429; la misura è stata ottenuta dall'interfaccia ufficiale. Chrome DevTools MCP non è disponibile: non è stata registrata una traccia DevTools locale.

## Difetti corretti nell'audit

- `robots.txt`: il riferimento assoluto a llms.txt rimane in coda come commento. La riga attiva `LLMs-txt:` era segnalata da Lighthouse come direttiva sconosciuta. Il link `rel="describedby"` rimane nell'HTML; Sitemap resta una direttiva attiva.
- `style.css`: riepilogo tariffe più leggibile sul fondo sabbia; contrasto calcolato da 4,43:1 a 5,24:1.
- Contatto email: Cloudflare trasformava il link pubblico in un indirizzo offuscato nell'HTML grezzo. Commenti selettivi `email_off` mantengono i contatti del sito leggibili senza cambiare impostazioni globali. [Documentazione Cloudflare](https://developers.cloudflare.com/waf/tools/scrape-shield/email-address-obfuscation/).
- `app.js` e `templates/index.html`: menu mobile con stato ARIA, gestione Escape, focus e background non interattivo durante l'apertura; ritorno alla sezione selezionata e gestione del cambio viewport.
- `templates/privacy.html`, `templates/success.html`, `templates/404.html`: landmark main; sitemap privacy aggiornata alla data sostanziale dichiarata, 22 settembre 2026.
- Coordinate schema, mappa e llms allineate alla scheda Google Business Profile del titolare: **38.0372, 14.0221**. Aggiunto il riferimento Maps in sameAs. Non sono state inventate cifre di precisione: l'idoneità alla specifica esperienza Google Vacation Rentals richiede ulteriori requisiti, inclusa geocodifica più precisa.
- Regola confermata dal proprietario: **tre notti per soggiorni che comprendono una notte in luglio/agosto; due negli altri periodi**. Check-out esclusivo: partenza il 1° luglio non comprende una notte di luglio; notte del 31 agosto sì. La regola è condivisa da browser e server, con messaggi IT/EN e FAQ/schema/llms coerenti.
- Calendario responsive: il numero di mesi ora si aggiorna anche al cambio di larghezza della finestra, preservando selezione e messaggi; prima rimaneva quello del caricamento iniziale.

## Verifica dopo le correzioni

[Secondo report PageSpeed, 17:17 CEST](https://pagespeed.web.dev/analysis/https-mont6cefalu-it/0xczmn89cx?form_factor=mobile): SEO **100**, accessibilità automatica **100**, best practice **100**, su entrambi i dispositivi; prestazioni mobile **88**, desktop **100**. Mobile FCP 2,4 s, LCP 3,2 s, TBT 50 ms, CLS 0, Speed Index 4,4 s. Desktop FCP 0,5 s, LCP 0,7 s, TBT 0 ms, CLS 0,009, Speed Index 0,7 s. Il test misura il rilascio `52716d1`; la successiva correzione del calendario riguarda i cambi di viewport. La variazione 87→88 delle prestazioni rientra nella variabilità di laboratorio, non dimostra un miglioramento causale della velocità.

- Build: 9 pagine complete, 207 file distribuiti. Suite finale: 70 test superati più 26 controlli routing/lingue. Test stagionali coprono browser/server, check-out esclusivo, cambi mese/anno e ora legale; verifiche frontend anche nei fusi Europe/Rome e America/Los_Angeles.
- Browser locale: menu mobile, Tab/Shift+Tab, Escape, focus sul titolo della sezione; FAQ aggiornata. Con disponibilità simulata, 1–3 luglio 2027 viene rifiutato con messaggio immediato, 1–4 luglio produce 3 notti/519 euro e rimuove l'errore. Nessun checkout reale; in preview l'endpoint di pagamento è disabilitato.
- Rilievo responsive desktop→mobile coperto da test automatico sui breakpoint; caricamento mobile e calendario a un mese verificati visivamente. Non è stata eseguita una matrice completa di browser/dispositivi fisici.
- Il detector Impeccable ha funzionato in modalità ridotta per dipendenze parser mancanti; ha segnalato solo il font Inter preesistente. Non è una certificazione di accessibilità: le prove Lighthouse, contrasto calcolato e tastiera sono registrate separatamente.
- Ispezione URL Google: entrambe le home risultano indicizzate con canonical scelto uguale al dichiarato. L'ispezione più recente mostra scansioni smartphone del **23 settembre** (IT 15:23:45, EN 16:24:44), più recenti del riepilogo copertura. Scansione e indicizzazione consentite, recupero riuscito.
- Test live Googlebot italiano, 24 settembre 17:17: URL disponibile per Google, pagina indicizzabile, un elemento Casa vacanze valido. Gli avvisi `review` e `aggregateRating` sono facoltativi: non sono stati riempiti con dati inventati o recensioni duplicate per azzerarli.
- Azioni manuali e problemi di sicurezza: **nessun problema rilevato** in entrambe le schermate Search Console.
- Il dettaglio storico delle ispezioni segnala «Errore temporaneo di elaborazione» nel campo Sitemap; il report Sitemap separato conferma invece invio riuscito e quattro URL rilevati. È un dato da ricontrollare dopo la nuova lettura, non un blocco dimostrato all'indicizzazione delle home.
- Aggiornamento conclusivo: richieste di nuova indicizzazione **IT ed EN accettate**, con inserimento nella coda prioritaria. Sitemap reinviata e già **letta il 24 settembre, stato Riuscita, quattro URL rilevati**. L'accettazione non garantisce tempi o risultati di posizionamento.
- Produzione finale: commit `d9dd6de4700391adf0356631bd6906af01ebfbc4`, deployment Cloudflare `213a0e74-8461-4b8f-888e-73f409221470`, successo alle 17:24:13 CEST. Home e modulo aggiornati HTTP 200, app.js v28 e booking-rules.js identici ai sorgenti. Cloudflare rimuove i commenti email_off dall'HTML servito e conserva correttamente il contatto mailto.
- Verifica finale dei dieci user-agent AI/Google: tutti HTTP 200; home e privacy IT/EN con mailto leggibili, coordinate corrette, robots standard. Il report interno restituisce 404 sul sito pubblico.

## Presenza esterna e misurabilità

Search Console è ora accessibile: l'utente ha aperto la proprietà con l'account corretto. Il precedente mancato accesso riguardava l'account browser iniziale; il connettore Windsor resta privo di collegamento Search Console. Non è stata creata una nuova proprietà.

| Verifica Search Console | Evidenza letta |
| --- | --- |
| Home indicizzate | `https://mont6cefalu.it/` e `/en/`; ispezione aggiornata: ultima scansione 23 settembre 2026 |
| 5 URL escluse | 2 redirect (`http://mont6cefalu.it/`, `?lang=en`), 1 variante con canonical (`?lang=it`), 2 privacy rilevate ma non indicizzate (`/privacy`, `/en/privacy`) |
| Sitemap | Riuscita, 4 pagine; reinviata e letta il 24 settembre 2026 |
| HTTPS e dati strutturati | 2 URL HTTPS valide, 0 problemi; 2 elementi VacationRental validi, 0 errori |
| Ricerca Web, 25 agosto–21 settembre | 8 clic, 62 impressioni, CTR 12,9%, posizione media 3,1 |
| Ricerca Web, 22 giugno–21 settembre | 26 clic, 254 impressioni, CTR 10,2%, posizione media 4,1 |
| Report AI beta, 25 agosto–21 settembre | 2 impressioni: 1 sulla variante HTTP della home e 1 sulla HTTPS; nessuna metrica clic in questa vista |
| Core Web Vitals | Nessun dato disponibile |

Il report di indicizzazione è aggiornato al 21 settembre e le scansioni riportate precedono l'upgrade del 24 settembre. Le esclusioni elencate non dimostrano un blocco generale del sito: includono varianti che reindirizzano o hanno una canonical e le due informative privacy. Le query visibili sono prevalentemente di marchio (`mont6`, `mont 6`), su volumi piccoli; la posizione media 3,1 non dimostra un risultato equivalente per ricerche generiche su Cefalù. Le query anonimizzate non compaiono nella tabella e i totali non coincidono necessariamente con la somma delle query visibili.

Le 2 impressioni nel [report AI di Google](https://search.google.com/u/1/search-console/performance/search-analytics/ai?resource_id=sc-domain%3Amont6cefalu.it&num_of_days=28) sono un primo segnale osservato, non una prova dell'efficacia delle modifiche appena pubblicate o di presenza su ChatGPT, Perplexity e Claude. La riga HTTP è storica e va distinta dal redirect HTTPS attuale.

- Google Business Profile verificato anche nell'interfaccia del titolare: nome, indirizzo, telefono, sito, WhatsApp, social e orari check-in/check-out coerenti. [Scheda Maps](https://maps.google.com/maps?cid=4203028787668436511). Il connettore restituisce descrizione vuota, ma la UI di questa struttura non espone un campo descrizione: nessuna modifica necessaria o pubblicata. Dettagli in [audit/external-citations-2026-09-24.md](audit/external-citations-2026-09-24.md).
- GA4 storica `mont6.it`: query vuote, non prova di traffico zero. Il sito non include GA4/GTM e la privacy dichiara Cloudflare Web Analytics; non emerge un tag GA4 rotto. Dettaglio delle letture e baseline GBP in [audit/connected-signals-2026-09-24.md](audit/connected-signals-2026-09-24.md).
- Le prime query pubbliche non mostravano il nuovo dominio; la successiva ricerca di marchio nell'account del titolare mostra il sito e il relativo snippet aggiornato. È una ricerca personalizzata, non una misura del posizionamento generico; Search Console resta la fonte per l'indicizzazione.
- Il proprietario ha acquistato nuovamente `mont6.it` su GoDaddy. Nameserver Cloudflare configurati e attivi; certificato Universal SSL attivo; tutte le varianti HTTP/HTTPS, apex/www, restituiscono 301 diretto al dominio nuovo conservando percorso e query. Verificato alle 18:12 CEST, senza disabilitare la verifica TLS. [Report redirect](audit/mont6-it-redirect-2026-09-24.md).
- [Airbnb](https://www.airbnb.com/rooms/48284780), [Booking](https://www.booking.com/hotel/it/montdeg6.en-gb.html) e [Visit Cefalù](https://www.visitcefalu.com/de/ferienhaeuser-cefalu/) confermano l'identità e l'indirizzo. [Wanderlog](https://wanderlog.com/place/details/4573826/mont6) cita ancora il vecchio dominio. Il portale [Città Metropolitana di Palermo](https://turismo.cittametropolitana.pa.it/accomodation/page/254/) usa una classificazione diversa: da correggere presso la fonte se non pertinente, senza importare stelle o servizi non confermati nel sito.

## Interventi e baseline aggiuntivi

- CSS completo della home e del calendario incluso nell'HTML durante la build, con percorsi asset assoluti per IT/EN: elimina la richiesta CSS che bloccava il primo rendering, senza dipendere da JavaScript per lo stile. Il documento compresso cresce di circa 13 KB, sostituendo una richiesta CSS di circa 13 KB; il CSS non è più condiviso dalla cache tra le home. `home.css` rimane disponibile per l'HTML precedente in cache.
- Aggiunti allo schema `sameAs` e a `llms.txt` i profili Facebook e Instagram già presenti nella scheda Google del titolare.
- Verifica visiva ha rilevato un difetto residuo di Flatpickr al passaggio desktop→mobile: una sola griglia manteneva larghezza inline di 618 px. Corretto il reset delle larghezze e della classe `multiMonth`, preservando date e messaggi; test di regressione aggiornato. Browser a 390 px: calendario 307,875 px, documento e scroll 375 px, nessun overflow. Home inglese e desktop verificati visivamente.
- Build e suite precedenti: 71 test più 26 controlli routing; dopo la correzione mirata del calendario, build e tutti i 12 test frontend passati. Nessun pagamento reale.
- Email di aggiornamento sito inviata a `support@wanderlog.com` da `mont6.home@gmail.com`, con conferma Gmail. La correzione della scheda non è ancora confermata. La richiesta alla Città Metropolitana resta in bozza per scelta esplicita del proprietario.
- Baseline Cloudflare Web Analytics raccolta in [audit/cloudflare-analytics-2026-09-24.md](audit/cloudflare-analytics-2026-09-24.md): 80 pageview e 80 visite stimate non bot negli ultimi 28 giorni completi; 250 pageview e 220 visite nei 90 giorni. Campionamento forte, circa 10–11×, e copertura iniziale parziale: non sono conteggi esatti né prenotazioni. Nessun referrer AI identificabile nel campione non dimostra assenza di citazioni AI.
- RUM mobile 28 giorni: LCP p75 1,432 s, INP 40 ms, CLS non disponibile. Desktop LCP 0,912 s, CLS 0,008, INP non disponibile. Mancano metriche per dichiarare superati tutti i Core Web Vitals; questi dati precedono l'ottimizzazione odierna.
- Controllo comparativo programmato per il **22 ottobre 2026 alle 10:00**, una sola esecuzione nella stessa task. Confronterà Search Console, Cloudflare e Google Business Profile con le baseline, riportando campionamento e limiti senza attribuire automaticamente le variazioni alle modifiche.

## Cosa rimane da misurare o verificare

### Rilascio e misura conclusivi, 18:19 CEST

Pubblicato il commit `06fffb1f5e26a1de37142296ff018db8cbf98032`; deployment Cloudflare `45415814-d98e-44bd-8736-2d978b00c576` riuscito alle **18:17:25 CEST**. Verifica HTTP successiva: tre home 200 con un solo `style#home-styles`, app v29, tre JSON-LD validi e quattro `sameAs`; app.js, robots.txt e llms.txt identici ai sorgenti. Il report delle citazioni restituisce 404 sul sito, come previsto.

[PageSpeed conclusivo, 18:18:38 CEST](https://pagespeed.web.dev/analysis/https-mont6cefalu-it/7zaul84c6v?form_factor=mobile), Lighthouse 13.5.0:

| Metrica | Mobile | Desktop |
| --- | ---: | ---: |
| Prestazioni | **90** | **100** |
| Accessibilità automatica | 100 | 100 |
| Best practice | 100 | 100 |
| SEO tecnico | 100 | 100 |
| FCP | 2,3 s | 0,5 s |
| LCP | 3,2 s | 0,7 s |
| TBT | 0 ms | 0 ms |
| CLS | 0,004 | 0,019 |
| Speed Index | 3,1 s | 0,6 s |

Rispetto alla misura precedente, mobile 88→90, Speed Index 4,4→3,1 s e TBT 50→0 ms; LCP sostanzialmente invariato a 3,2 s. La diagnostica non segnala più il CSS home tra le richieste bloccanti. I piccoli aumenti CLS restano sotto 0,1. È un confronto tra singole misure di laboratorio, soggette a variabilità, non una prova statistica né un esito dei Core Web Vitals sul campo. La modifica è mantenuta perché rimuove la dipendenza di rete CSS e non ha mostrato regressioni funzionali nella verifica.

### Verifiche successive

1. Risposta di Wanderlog e aggiornamento effettivo della sua scheda; il redirect del vecchio dominio è già operativo.
2. Verificare l'aggiornamento dell'indice dopo le richieste accettate e raccogliere una baseline successiva di rendimento Web e AI. Accesso Search Console, indicizzazione delle home, test live IT e nuova lettura della sitemap del 24 settembre sono già confermati.
3. Raccolta di dati reali successivi al rilascio, con particolare attenzione alle metriche mancanti; LCP mobile di laboratorio a 3,2 s conserva margine di miglioramento.
4. Verifica puntuale della geocodifica se si vuole perseguire l'esperienza Google Vacation Rentals; le coordinate confermate dal profilo hanno quattro decimali.
5. Eventuale verifica amministrativa della discordanza sul portale Città Metropolitana, lasciata in bozza per scelta del proprietario. Recensioni, dati commerciali delle piattaforme e policy esterne non sono stati importati automaticamente.

Non è stato effettuato un pagamento reale. L'audit non certifica conformità normativa né garantisce citazioni da ChatGPT, Perplexity, Claude o Google AI Overviews. [Google chiarisce che le funzionalità AI seguono i requisiti di ricerca](https://developers.google.com/search/docs/appearance/ai-features).
