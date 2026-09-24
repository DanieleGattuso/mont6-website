# Segnali misurabili SEO/GEO — 24 settembre 2026

Audit in sola lettura delle fonti già collegate a Windsor.ai, del codice locale di Mont°6 e della proprietà Search Console aperta successivamente dall'utente con l'account corretto. Nessuna nuova connessione Windsor o configurazione esterna è stata creata da questo controllo.

Al termine della lettura, il coordinatore ha reinviato la sitemap aggiornata e richiesto la nuova indicizzazione delle due home: entrambe le richieste accettate. La sitemap risulta inviata e letta il 24 settembre 2026, Riuscita, quattro URL. Queste operazioni successive non modificano i periodi storici delle metriche sotto riportate. Test live Googlebot IT del 24 settembre: pagina indicizzabile, un VacationRental valido; nessun problema nei report azioni manuali e sicurezza. Ispezioni delle due home confermano canonical scelto coerente e ultime scansioni del 23 settembre, più recenti del riepilogo copertura.

## Esito

Il profilo Google Business di Mont°6 è accessibile, rimanda al dominio corretto e conferma indirizzo, telefono e coordinate. La proprietà Search Console è ora accessibile dal browser dopo l'apertura da parte dell'utente con l'account corretto: le home italiana e inglese sono indicizzate, la sitemap risulta riuscita e il riepilogo mostra 2 elementi VacationRental validi senza errori. Le 5 URL escluse sono due redirect, una variante con canonical e due pagine privacy; non costituiscono indiscriminatamente cinque errori gravi. Nei 28 giorni disponibili Search Console riporta 8 clic e 62 impressioni Web, con volumi contenuti e prevalenza del marchio nelle query visibili. Il report AI di Google mostra inoltre 2 impressioni: una presenza osservata, ma su un campione minimo e precedente all'upgrade. La proprietà GA4 disponibile tramite Windsor restituisce risultati vuoti.

Il codice del sito dichiara l'uso di Cloudflare Web Analytics e non contiene un tag GA4. L'assenza di dati GA4 non dimostra quindi un guasto nel sistema di statistiche effettivamente scelto per il sito; le statistiche Cloudflare non sono state lette attraverso Windsor in questo controllo.

## Fonti e metodo

- Fonte: connettore Windsor.ai già disponibile nella sessione, interrogato con `get_connectors(include_not_yet_connected=false, include_actions=false, include_options=true)`.
- Fonte aggiuntiva successiva: interfaccia Google Search Console, letta dall'agente principale sul browser aperto dall'utente con l'account corretto. I dati iniziali riportati sotto provengono da quella lettura, non da Windsor.
- Fonti connesse restituite: Google Analytics 4, proprietà denominata `mont6.it`; Google Business Profile, attività `Mont°6`.
- Campi verificati prima delle query con `get_fields`; opzioni verificate con `get_options`.
- Periodo recente: **27 agosto–23 settembre 2026**, 28 giorni completi rispetto alla data dell'audit.
- Periodo precedente: **30 luglio–26 agosto 2026**, 28 giorni.
- Controllo GA4 esteso: **24 settembre 2025–23 settembre 2026**.
- Search Console usa intervalli separati, letti dall'interfaccia: **25 agosto–21 settembre 2026** per 28 giorni e **22 giugno–21 settembre 2026** per tre mesi. Questi intervalli terminano due giorni prima di quelli Windsor.
- Il confronto precedente è una baseline stagionale, non un esperimento controllato. I dati non dimostrano un effetto delle modifiche appena pubblicate.

## Search Console: accesso iniziale limitato, poi disponibile dal browser

### Limite iniziale di Windsor e dell'account precedente

`get_connectors` non restituisce una fonte Search Console connessa. È stato verificato anche l'eventuale accesso ai dati Search tramite il collegamento GA4, interrogando i campi documentati `organic_google_search_clicks`, `organic_google_search_impressions`, `organic_google_search_click_through_rate` e `organic_google_search_average_position`.

Il servizio restituisce questo errore esplicito:

> The requested Search Console fields require an active Search Console link for the mont6.it account. Please link Search Console to the GA4 property, or remove the Search Console fields from the query.

Questa limitazione riguarda il percorso Windsor/GA4, e l'account browser inizialmente usato non era quello corretto. **Non significa che la proprietà Search Console non esista o che il sito non sia indicizzato.** L'utente ha successivamente aperto la proprietà con l'account corretto, rendendo possibile la lettura diretta nel browser senza collegare una nuova fonte a Windsor.

### Prime evidenze dalla proprietà aperta dall'utente

| Indicatore del riepilogo Search Console | Valore letto |
|---|---:|
| URL indicizzate | 2 |
| URL escluse / non indicizzate | 5 |
| Clic totali nei tre mesi 22/06–21/09/2026 | 26 |
| URL HTTPS valide | 2 |
| Problemi HTTPS | 0 |
| Elementi VacationRental validi | 2 |
| Errori VacationRental | 0 |
| Core Web Vitals | Nessun dato disponibile |

I 26 clic si riferiscono ai tre mesi 22 giugno–21 settembre 2026: non confrontare questo valore con i periodi Windsor di 28 giorni. L'assenza di dati Core Web Vitals non è un esito positivo o negativo delle prestazioni.

### Indicizzazione delle pagine e motivi di esclusione

Report di indicizzazione aggiornato al **21 settembre 2026**. Le ultime scansioni indicate sotto risalgono al **10 settembre 2026**, prima dell'upgrade pubblicato il 24 settembre: questi dati non dimostrano ancora una nuova scansione delle modifiche.

| URL | Stato / motivo | Ultima scansione |
|---|---|---|
| `https://mont6cefalu.it/` | Indicizzata | 10/09/2026 |
| `https://mont6cefalu.it/en/` | Indicizzata | 10/09/2026 |
| `http://mont6cefalu.it/` | Pagina con reindirizzamento | 10/09/2026 |
| `https://mont6cefalu.it/?lang=en` | Pagina con reindirizzamento | 10/09/2026 |
| `https://mont6cefalu.it/privacy` | Rilevata, attualmente non indicizzata | N/D |
| `https://mont6cefalu.it/en/privacy` | Rilevata, attualmente non indicizzata | N/D |
| `https://mont6cefalu.it/?lang=it` | Esclusione relativa alla canonical | 10/09/2026 |

Le due pagine principali risultano quindi presenti nell'indice. L'esclusione delle varianti che reindirizzano è coerente con la normalizzazione degli indirizzi; le due privacy sono state scoperte ma non risultano ancora indicizzate. Non si tratta, in base a questi dati, di un blocco generale alla scansione del sito.

### Sitemap

La sitemap è già presente in Search Console con stato **Riuscita**, **4 pagine** rilevate, invio e ultima lettura al **15 settembre 2026**. Anche questa lettura precede l'upgrade del 24 settembre.

### Rendimento nella ricerca Web di Google

| Intervallo mostrato da Search Console | Clic | Impressioni | CTR | Posizione media |
|---|---:|---:|---:|---:|
| 22/06–21/09/2026, tre mesi | 26 | 254 | 10,2% | 4,1 |
| 25/08–21/09/2026, 28 giorni | 8 | 62 | 12,9% | 3,1 |

Esempi di query visibili nell'interfaccia:

| Intervallo | Query | Clic | Impressioni |
|---|---|---:|---:|
| Tre mesi | `mont6` | 11 | 42 |
| Tre mesi | `mont 6` | 2 | 28 |
| 28 giorni | `mont6` | 3 | 14 |
| 28 giorni | `6mont` | 0 | 1 |

Le query mostrate hanno una forte componente di marchio e i volumi sono piccoli. **La posizione media 3,1 non dimostra un posizionamento equivalente per ricerche generiche come case vacanze a Cefalù.** Le tabelle delle query visibili non sommano necessariamente ai totali, poiché Google omette le query anonimizzate. Non sono stati misurati incrementi rispetto a un periodo precedente né un effetto dell'upgrade appena pubblicato.

### Presenza nelle funzionalità AI di Google

Il [report AI beta di Search Console](https://search.google.com/u/1/search-console/performance/search-analytics/ai?resource_id=sc-domain%3Amont6cefalu.it&num_of_days=28), letto dall'agente principale nell'account corretto, mostra **2 impressioni totali** nei **28 giorni 25 agosto–21 settembre 2026**.

| Pagina nella tabella del report AI | Impressioni |
|---|---:|
| `http://mont6cefalu.it/` | 1 |
| `https://mont6cefalu.it/` | 1 |

Questa vista non offre una metrica clic: non assegnare quindi un valore zero ai clic e non calcolare un CTR. Il dato è un'evidenza di presenza nelle funzionalità AI di Google, con campione minimo e antecedente all'upgrade del 24 settembre. Non identifica in questo audit il testo delle risposte, non dimostra una frequenza stabile di citazioni e non prova presenza su ChatGPT Search, Perplexity o Claude. La riga HTTP è un dato storico del report e va distinta dallo stato attuale del redirect HTTPS.

L'accesso alla proprietà corretta è ora disponibile. Il solo collegamento a GA4 può fornire alcune metriche Search; non sostituisce tutti i controlli di indicizzazione e ispezione URL. Nessuna nuova connessione Windsor è stata creata.

## GA4: risultato vuoto e assenza del tag nel codice

Per entrambi i periodi di 28 giorni sono stati richiesti `hostname`, `sessions`, `active_users`, `screen_page_views`, `engagement_rate`, `conversions` ed `ecommerce_purchases`. La risposta è stata `result: []` per ciascun periodo.

Anche il controllo annuale con `hostname`, `sessions` e `screen_page_views` restituisce `result: []`.

**Una risposta `[]` significa che la query non ha restituito righe; non equivale a un valore numerico zero.** Non è possibile ricavare da queste risposte visitatori, traffico organico, conversioni, prenotazioni o variazioni percentuali. Il nome `mont6.it` della proprietà, da solo, non identifica lo stream usato dal dominio attuale.

### Confronto degli identificativi di misurazione

Windsor espone i campi `measurement_id`, `stream_id` e `stream_name`. Sono state effettuate queste letture:

- `account_id`, `account_name`, `measurement_id`, per il 23 settembre 2026: `result: []`.
- `stream_id`, `stream_name`, `hostname`, `screen_page_views`, per il controllo annuale: `result: []`.

Il connettore non ha quindi restituito un Measurement ID o uno stream confrontabile.

La ricerca locale negli HTML, JavaScript e JSON del progetto, inclusi i file generati disponibili, non trova identificativi `G-…`, `GTM-…`, inclusioni `googletagmanager` o chiamate `gtag(`. Il template privacy dichiara invece che il sito non utilizza Google Analytics e che usa Cloudflare Web Analytics (`templates/privacy.html`, paragrafi alle righe 185–191 al momento della verifica). La Content Security Policy in `_headers` autorizza gli endpoint di Cloudflare Insights.

Conclusione: **non emerge un'implementazione GA4 dal codice controllato**. Non aggiungere un tag soltanto per popolare la proprietà storica: prima occorre chiarire quale sistema di misurazione si vuole usare e verificare quello già dichiarato. Questo documento non modifica tracking, consenso o informative.

## Google Business Profile: identità e coerenza locale

Dati restituiti in lettura dal profilo Google Business già connesso:

| Campo | Valore |
|---|---|
| Nome | Mont°6 |
| Sito ufficiale | https://mont6cefalu.it/ |
| Categoria principale | Casa per vacanze |
| Indirizzo | Vicolo Monteleone, 6 |
| Località / CAP / Paese | Cefalù / 90015 / IT |
| Telefono | 388 190 8816 |
| Latitudine | 38.0372 |
| Longitudine | 14.0221 |
| Stato attività | OPEN |
| Descrizione del profilo | `null` |
| Google Maps | https://maps.google.com/maps?cid=4203028787668436511 |

Le coordinate sono quindi confermate come coerenti con il profilo Google del titolare. Il dato disponibile ha quattro decimali: non è una misurazione dell'ingresso dell'immobile con precisione maggiore. Il valore `null` della descrizione indica che questo campo non è stato restituito valorizzato dal connettore; merita un controllo nel profilo prima di considerarlo definitivamente assente.

## Google Business Profile: baseline di rendimento

Query per l'attività Mont°6 con i campi documentati `impressions`, `website_clicks`, `call_clicks` e `direction_requests`:

| Metrica | 27/08–23/09/2026 | 30/07–26/08/2026 | Differenza assoluta |
|---|---:|---:|---:|
| Impressioni Search + Maps, desktop + mobile | 63 | 99 | -36 |
| Clic al sito dal profilo | 2 | 0 | +2 |
| Clic sul pulsante chiamata | 1 | 0 | +1 |
| Richieste di indicazioni | 30 | 38 | -8 |

Qui gli zeri sono valori numerici restituiti dal servizio, diversamente dalle risposte GA4 senza righe. Le richieste di indicazioni non sono arrivi confermati; i clic al sito non sono prenotazioni. Le impressioni sono quelle del profilo Google Business e **non** le impressioni organiche delle pagine web in Search Console.

## Verifiche ancora necessarie

1. Verificare in seguito una nuova scansione delle home e una nuova lettura della sitemap successive all'upgrade del 24 settembre; i dati attuali precedono la pubblicazione.
2. Leggere i dati di Cloudflare Web Analytics, il sistema dichiarato dal sito, per una baseline di visite e sorgenti disponibili.
3. Valutare il rendimento dopo un periodo osservabile, mantenendo distinta la stagionalità dagli effetti delle modifiche.
4. Controllare direttamente nel profilo Google il campo descrizione restituito `null` prima di eventuali interventi editoriali.

Il report AI di Google costituisce una prima evidenza osservata, ma nessuna delle fonti lette fornisce in questo audit una misura esaustiva delle citazioni di Mont°6 nei diversi motori generativi.
