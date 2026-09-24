# Verifica SEO, GEO e accessibilità — 24 settembre 2026

Il sito ha una base tecnica solida e Search Console conferma l'indicizzazione delle home italiana e inglese, una sitemap riuscita e 2 elementi VacationRental validi senza errori. Il report AI di Google mostra anche 2 impressioni, su un campione minimo precedente all'upgrade. Non è corretto definirlo ottimale in ogni aspetto: il vecchio dominio non risolve, le prestazioni mobile hanno margine e i volumi di ricerca osservati sono ancora contenuti. Il test Lighthouse SEO riguarda requisiti tecnici di base, non posizioni o probabilità di citazione AI.

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
| Home indicizzate | `https://mont6cefalu.it/` e `/en/`; ultima scansione 10 settembre 2026 |
| 5 URL escluse | 2 redirect (`http://mont6cefalu.it/`, `?lang=en`), 1 variante con canonical (`?lang=it`), 2 privacy rilevate ma non indicizzate (`/privacy`, `/en/privacy`) |
| Sitemap | Riuscita, 4 pagine; inviata e letta il 15 settembre 2026 |
| HTTPS e dati strutturati | 2 URL HTTPS valide, 0 problemi; 2 elementi VacationRental validi, 0 errori |
| Ricerca Web, 25 agosto–21 settembre | 8 clic, 62 impressioni, CTR 12,9%, posizione media 3,1 |
| Ricerca Web, 22 giugno–21 settembre | 26 clic, 254 impressioni, CTR 10,2%, posizione media 4,1 |
| Report AI beta, 25 agosto–21 settembre | 2 impressioni: 1 sulla variante HTTP della home e 1 sulla HTTPS; nessuna metrica clic in questa vista |
| Core Web Vitals | Nessun dato disponibile |

Il report di indicizzazione è aggiornato al 21 settembre e le scansioni riportate precedono l'upgrade del 24 settembre. Le esclusioni elencate non dimostrano un blocco generale del sito: includono varianti che reindirizzano o hanno una canonical e le due informative privacy. Le query visibili sono prevalentemente di marchio (`mont6`, `mont 6`), su volumi piccoli; la posizione media 3,1 non dimostra un risultato equivalente per ricerche generiche su Cefalù. Le query anonimizzate non compaiono nella tabella e i totali non coincidono necessariamente con la somma delle query visibili.

Le 2 impressioni nel [report AI di Google](https://search.google.com/u/1/search-console/performance/search-analytics/ai?resource_id=sc-domain%3Amont6cefalu.it&num_of_days=28) sono un primo segnale osservato, non una prova dell'efficacia delle modifiche appena pubblicate o di presenza su ChatGPT, Perplexity e Claude. La riga HTTP è storica e va distinta dal redirect HTTPS attuale.

- Google Business Profile connesso: nome, indirizzo, telefono e sito ufficiale coerenti. [Scheda Maps](https://maps.google.com/maps?cid=4203028787668436511). Descrizione del profilo restituita vuota dal connettore.
- GA4 storica `mont6.it`: query vuote, non prova di traffico zero. Il sito non include GA4/GTM e la privacy dichiara Cloudflare Web Analytics; non emerge un tag GA4 rotto. Dettaglio delle letture e baseline GBP in [audit/connected-signals-2026-09-24.md](audit/connected-signals-2026-09-24.md).
- Le query pubbliche non hanno mostrato il nuovo dominio. Questo non dimostra mancata indicizzazione e non sostituisce Search Console.
- Il vecchio `mont6.it` compare ancora in risultati e citazioni, ma DNS Google restituisce NXDOMAIN per apex e www. Il proprietario conferma che è suo e ritiene possa essere scaduto. Scadenza e registrar non sono stati accertati; nessun rinnovo o acquisto eseguito. Va verificato nel pannello del registrar e, se recuperabile, ripristinato con redirect permanente al dominio nuovo.
- [Airbnb](https://www.airbnb.com/rooms/48284780), [Booking](https://www.booking.com/hotel/it/montdeg6.en-gb.html) e [Visit Cefalù](https://www.visitcefalu.com/de/ferienhaeuser-cefalu/) confermano l'identità e l'indirizzo. [Wanderlog](https://wanderlog.com/place/details/4573826/mont6) cita ancora il vecchio dominio. Il portale [Città Metropolitana di Palermo](https://turismo.cittametropolitana.pa.it/accomodation/page/254/) usa una classificazione diversa: da correggere presso la fonte se non pertinente, senza importare stelle o servizi non confermati nel sito.

## Cosa rimane da completare

1. Recupero/verifica del vecchio dominio presso il registrar e consolidamento delle citazioni con redirect.
2. Verificare l'aggiornamento dell'indice dopo le richieste accettate e raccogliere una baseline successiva di rendimento Web e AI. Accesso Search Console, indicizzazione delle home, test live IT e nuova lettura della sitemap del 24 settembre sono già confermati.
3. Ottimizzazione ulteriore del rendering mobile e successiva raccolta di dati reali; non sono disponibili metriche INP sul campo.
4. Verifica puntuale della geocodifica se si vuole perseguire l'esperienza Google Vacation Rentals; le coordinate confermate dal profilo hanno quattro decimali.
5. Eventuali aggiornamenti della descrizione GBP e delle citazioni esterne, da preparare e pubblicare nella fonte pertinente. Recensioni, dati commerciali delle piattaforme e policy esterne non sono stati importati automaticamente.

Non è stato effettuato un pagamento reale. L'audit non certifica conformità normativa né garantisce citazioni da ChatGPT, Perplexity, Claude o Google AI Overviews. [Google chiarisce che le funzionalità AI seguono i requisiti di ricerca](https://developers.google.com/search/docs/appearance/ai-features).
