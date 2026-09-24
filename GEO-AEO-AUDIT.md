# Mont°6 — Audit GEO/AEO e codice applicato

Verifica del repository: 24 settembre 2026. Modifiche applicate e build locale completata; nessuna pubblicazione sul dominio eseguita.

## File completi e posizione pubblica

- [robots.txt:1](<C:/Users/danie/OneDrive/Desktop/Sito Ufficiale Mont6/robots.txt:1>): file completo, con tutti i bot richiesti più Claude-SearchBot e Claude-User. Ogni gruppo consente il sito pubblico ed esclude /api/. Sitemap e LLMs-txt sono riferimenti assoluti. Le pagine di esito restano scansionabili affinché i motori possano leggere noindex.
- [llms.txt:1](<C:/Users/danie/OneDrive/Desktop/Sito Ufficiale Mont6/llms.txt:1>): file completo in italiano con brand, appartamento, contatti, link reali e sezione FAQ & Regole Chiave. Rimossi prezzi obsoleti e promesse di risparmio non presenti nel testo attuale.
- [scripts/distribution.js:1](<C:/Users/danie/OneDrive/Desktop/Sito Ufficiale Mont6/scripts/distribution.js:1>): il progetto pubblica dist/, non public/. I due file sorgente nella root sono già copiati in dist/robots.txt e dist/llms.txt dalla build; gli URL finali sono https://mont6cefalu.it/robots.txt e https://mont6cefalu.it/llms.txt. Non creare una seconda cartella public/ scollegata dalla distribuzione.
- [sitemap.xml:1](<C:/Users/danie/OneDrive/Desktop/Sito Ufficiale Mont6/sitemap.xml:1>): aggiornato lastmod delle due home alla data delle modifiche; mantenuti canonical e alternate IT/EN.

## Dove si trovano i blocchi JSON-LD

La fonte modificabile è [templates/index.html:52](<C:/Users/danie/OneDrive/Desktop/Sito Ufficiale Mont6/templates/index.html:52>), nel `<head>` dopo il foglio di stile e prima di `</head>`. Il blocco VacationRental descrive l’attività; il blocco FAQPage viene compilato dalle otto FAQ HTML; WebSite identifica il sito ufficiale. [scripts/build-en.js:70](<C:/Users/danie/OneDrive/Desktop/Sito Ufficiale Mont6/scripts/build-en.js:70>) produce IT e EN, localizza FAQ e riferimenti pagina, e legge prezzi.json per i prezzi minimi e massimi.

Comando di rigenerazione: npm run build. Modificare templates/ e prezzi.json, poi rigenerare. Non modificare manualmente i documenti generati e non aggiungere blocchi duplicati. I blocchi completi seguenti sono già presenti nella home italiana; per un HTML statico equivalente vanno nel `<head>` in sostituzione dei vecchi blocchi.

### VacationRental

Già inserito in [index.html:54](<C:/Users/danie/OneDrive/Desktop/Sito Ufficiale Mont6/index.html:54>). La versione inglese è in [en/index.html:57](<C:/Users/danie/OneDrive/Desktop/Sito Ufficiale Mont6/en/index.html:57>).

```html
<script type="application/ld+json">
{
    "@context": "https://schema.org",
    "@type": "VacationRental",
    "additionalType": "Apartment",
    "name": "Mont°6",
    "alternateName": "Mont°6 Luxury Retreat",
    "identifier": "IT082027C2YCA7QI4V",
    "description": "Appartamento indipendente nel centro storico pedonale di Cefalù: una camera, un bagno, cucina attrezzata, aria condizionata e Wi-Fi in fibra. Due minuti a piedi dal Duomo, cinque dalla spiaggia.",
    "url": "https://mont6cefalu.it/",
    "logo": "https://mont6cefalu.it/img/logo-dark-250.png",
    "sameAs": [
        "https://www.airbnb.it/rooms/48284780"
    ],
    "telephone": "+39-388-190-8816",
    "email": "mont6.home@gmail.com",
    "image": [
        "https://mont6cefalu.it/img/_MG_4132.jpg",
        "https://mont6cefalu.it/img/_MG_4136.jpg",
        "https://mont6cefalu.it/img/_MG_4126.jpg",
        "https://mont6cefalu.it/img/_MG_4193.jpg",
        "https://mont6cefalu.it/img/_MG_4152.jpg",
        "https://mont6cefalu.it/img/_MG_4189.jpg",
        "https://mont6cefalu.it/img/_MG_4135.jpg",
        "https://mont6cefalu.it/img/_MG_4179.jpg"
    ],
    "latitude": 38.0386,
    "longitude": 14.0226,
    "address": {
        "@type": "PostalAddress",
        "streetAddress": "Vicolo Monteleone 6",
        "addressLocality": "Cefalù",
        "addressRegion": "Palermo",
        "postalCode": "90015",
        "addressCountry": "IT"
    },
    "geo": {
        "@type": "GeoCoordinates",
        "latitude": 38.0386,
        "longitude": 14.0226
    },
    "priceRange": "€82 - €200 a notte",
    "knowsLanguage": [
        "it-IT",
        "en-GB"
    ],
    "containsPlace": {
        "@type": "Accommodation",
        "additionalType": "EntirePlace",
        "occupancy": {
            "@type": "QuantitativeValue",
            "value": 2
        },
        "numberOfBedrooms": 1,
        "numberOfBathroomsTotal": 1,
        "bed": {
            "@type": "BedDetails",
            "numberOfBeds": 1,
            "typeOfBed": "Double"
        },
        "amenityFeature": [
            {
                "@type": "LocationFeatureSpecification",
                "name": "ac",
                "value": true
            },
            {
                "@type": "LocationFeatureSpecification",
                "name": "wifi",
                "value": true
            },
            {
                "@type": "LocationFeatureSpecification",
                "name": "kitchen",
                "value": true
            },
            {
                "@type": "LocationFeatureSpecification",
                "name": "petsAllowed",
                "value": false
            }
        ]
    },
    "checkinTime": "15:00:00",
    "checkoutTime": "10:00:00",
    "petsAllowed": false,
    "@id": "https://mont6cefalu.it/#apartment",
    "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://mont6cefalu.it/#webpage",
        "url": "https://mont6cefalu.it/",
        "name": "Mont°6 — Appartamento nel centro storico di Cefalù | Prenotazione diretta",
        "inLanguage": "it",
        "isPartOf": {
            "@id": "https://mont6cefalu.it/#website"
        },
        "mainEntity": {
            "@id": "https://mont6cefalu.it/#apartment"
        }
    }
}
    </script>
```

### FAQPage

Già inserito in [index.html:158](<C:/Users/danie/OneDrive/Desktop/Sito Ufficiale Mont6/index.html:158>). La versione inglese è in [en/index.html:161](<C:/Users/danie/OneDrive/Desktop/Sito Ufficiale Mont6/en/index.html:161>).

```html
<script type="application/ld+json">
{
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
        {
            "@type": "Question",
            "name": "Orari di arrivo e partenza",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Puoi entrare dalle 15:00 con la serratura digitale. Il giorno della partenza lascia la casa entro le 10:00, così possiamo prepararla per i prossimi ospiti."
            }
        },
        {
            "@type": "Question",
            "name": "Dove posso parcheggiare?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Il \"Parcheggio Coco\" sul lungomare è a circa 5 minuti a piedi da Mont°6. L'appartamento si trova nel centro storico pedonale, con una zona ZTL per residenti."
            }
        },
        {
            "@type": "Question",
            "name": "È possibile soggiornare con animali?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "No, gli animali domestici non sono ammessi a Mont°6."
            }
        },
        {
            "@type": "Question",
            "name": "La biancheria e gli asciugamani sono inclusi?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Sì, forniamo biancheria da letto, asciugamani e un set base di prodotti per la colazione."
            }
        },
        {
            "@type": "Question",
            "name": "Qual è il soggiorno minimo?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Il soggiorno minimo è di 2 notti. Durante l'alta stagione (luglio-agosto) potrebbero essere richieste 3 notti."
            }
        },
        {
            "@type": "Question",
            "name": "Posso annullare? Come funziona il rimborso?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Con almeno 14 giorni di anticipo sull'arrivo, la cancellazione è gratuita: rimborso del 100%. Con almeno 7 giorni ma meno di 14 giorni di anticipo, il rimborso è del 50%. Con meno di 7 giorni di anticipo, oppure in caso di mancato arrivo, non è previsto rimborso. Il rimborso torna sulla stessa carta con cui hai pagato, in genere entro 5-10 giorni lavorativi. Per annullare basta scrivermi su WhatsApp o via email."
            }
        },
        {
            "@type": "Question",
            "name": "L'imposta di soggiorno è inclusa?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "No, è l'unica cosa che non è inclusa nel totale che vedi qui. Il Comune di Cefalù chiede 2 € a persona per notte, per un massimo di 5 notti: si paga all'arrivo, in contanti. Per due persone e tre notti sono 12 €."
            }
        },
        {
            "@type": "Question",
            "name": "Conviene prenotare qui invece che sui portali?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Qui prenoti direttamente con me, senza commissioni di prenotazione. Per confrontare le offerte, controlla sempre le stesse date e condizioni. Trovi una bottiglia di vino siciliano ad aspettarti e gli orari di arrivo e partenza sono flessibili quando la casa è libera."
            }
        }
    ],
    "@id": "https://mont6cefalu.it/#faq",
    "url": "https://mont6cefalu.it/#faq",
    "inLanguage": "it",
    "about": {
        "@id": "https://mont6cefalu.it/#apartment"
    },
    "isPartOf": {
        "@id": "https://mont6cefalu.it/#webpage"
    }
}
    </script>
```

### WebSite

Già inserito in [index.html:239](<C:/Users/danie/OneDrive/Desktop/Sito Ufficiale Mont6/index.html:239>). La versione inglese è in [en/index.html:242](<C:/Users/danie/OneDrive/Desktop/Sito Ufficiale Mont6/en/index.html:242>).

```html
<script type="application/ld+json">
{
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://mont6cefalu.it/#website",
    "url": "https://mont6cefalu.it/",
    "name": "Mont°6",
    "alternateName": "Mont°6 Luxury Retreat",
    "inLanguage": [
        "it",
        "en"
    ],
    "publisher": {
        "@id": "https://mont6cefalu.it/#apartment"
    }
}
    </script>
```

## Semantica e contenuti accessibili

- [templates/index.html:259](<C:/Users/danie/OneDrive/Desktop/Sito Ufficiale Mont6/templates/index.html:259>): aggiunto main con destinazione della skip-link e focus nativo. H1 identifica Mont°6 e l’appartamento a Cefalù; sezioni H2 e domande/servizi H3, senza salti.
- [templates/index.html:323](<C:/Users/danie/OneDrive/Desktop/Sito Ufficiale Mont6/templates/index.html:323>): testo iniziale diretto su attività, due ospiti e ubicazione; risposte immediate su servizi, parcheggio e animali.
- [templates/index.html:755](<C:/Users/danie/OneDrive/Desktop/Sito Ufficiale Mont6/templates/index.html:755>): intervallo tariffe e imposta esclusa leggibili nell’HTML; valori generati da prezzi.json insieme al prezzo iniziale e a priceRange, attualmente 82–200 euro a notte.
- [app.js:613](<C:/Users/danie/OneDrive/Desktop/Sito Ufficiale Mont6/app.js:613>) e [style.css:676](<C:/Users/danie/OneDrive/Desktop/Sito Ufficiale Mont6/style.css:676>): FAQ visibili di default; solo dopo inizializzazione JavaScript vengono attivati i controlli di apertura, con aria-expanded, aria-controls e hidden coerenti. Rimosso max-height:260px, che poteva troncare i rimborsi.
- [templates/index.html:869](<C:/Users/danie/OneDrive/Desktop/Sito Ufficiale Mont6/templates/index.html:869>): fallback per richiesta disponibilità via WhatsApp/email. [templates/index.html:1014](<C:/Users/danie/OneDrive/Desktop/Sito Ufficiale Mont6/templates/index.html:1014>): email e telefono permanenti e cliccabili.

Il sito era già prerenderizzato in HTML italiano e inglese: descrizioni, foto, servizi, distanze e FAQ non dipendono da CSR. La mappa interattiva, le disponibilità aggiornate e il preventivo per date selezionate richiedono JavaScript/API. Indirizzo e distanze rimangono testo statico; il riepilogo tariffe e i contatti rendono consultabili le informazioni essenziali. Non vengono pubblicate disponibilità o offerte inventate.

## Dati da confermare e manutenzione

- Coordinate: 38.0386, 14.0226 sono quelle del repository, ma app.js le definisce approssimate. Sono state conservate senza inventare precisione aggiuntiva. Verificare il punto effettivo dell’immobile prima di considerarlo geocodifica esatta.
- Minimo notti: il frontend/backend applicano due notti; il testo ammette che in luglio/agosto possano esserne richieste tre. llms.txt mantiene questa possibilità come da confermare con il gestore. Per renderla obbligatoria occorre una scelta commerciale e un aggiornamento congiunto delle regole di prenotazione.
- Non sono presenti orari di reception verificabili: non è stato inventato openingHours. Check-in 15:00 e check-out 10:00 sono orari locali, senza fissare erroneamente UTC+2 anche in inverno.
- Logo e sameAs derivano dagli asset e dal link Airbnb esistenti. Rimossi childrenAllowed, airportShuttle e numberOfRooms non supportati con precisione dal testo. Recensioni e rating di Airbnb rimangono attribuiti nel contenuto visibile, senza duplicarli nello schema dell’attività.
- Ogni aggiornamento delle tariffe richiede una nuova build; il preventivo finale continua a essere calcolato per le date scelte. Policy e imposta sono riportate come informazioni pubblicate nel sito, senza una verifica normativa esterna.

## Verifiche eseguite

- npm run build: 9 pagine generate, 206 file pubblici; verifica lingua, titoli, ID, percorsi e JSON-LD.
- npm test: 57 test passati e 26 controlli routing/lingue passati.
- Controlli mirati: gruppi crawler, esclusione API, tutte le FAQ dello schema uguali al testo HTML in entrambe le lingue, asset del JSON-LD esistenti, prezzi coerenti, un main e un H1, soli livelli H1-H3, tutti i link interni e anchor di llms.txt validi, file copiati in dist identici ai sorgenti.
- Browser locale: impaginazione desktop e controllo mobile a 390px, focus della skip-link, apertura/chiusura FAQ e collegamento da tastiera alla policy inglese. Policy italiana aperta senza troncamenti anche oltre 260px. Con script bloccati via CSP, tutte le 8 FAQ restano presenti e leggibili.
- La preview è statica: API di prenotazione non disponibili in questa anteprima. Nessun pagamento reale eseguito.

## Limiti e riferimenti ufficiali

robots.txt disciplina la scansione, non sostituisce i controlli di accesso. Le risorse private restano escluse dalla distribuzione e gestite dal server. LLMs-txt è un riferimento informativo non standard REP: i parser che non lo riconoscono possono ignorarlo. È stato aggiunto anche rel="describedby" nel `<head>`, come raccomandato dalla [proposta llms.txt](https://llmstxt.org/).

I bot hanno finalità diverse: OAI-SearchBot riguarda la ricerca, ChatGPT-User le richieste degli utenti, GPTBot l’addestramento. Sono autorizzati tutti come richiesto. Fonte: [documentazione crawler OpenAI](https://developers.openai.com/api/docs/bots).

Google AI Overviews usa l’accessibilità a Googlebot e i requisiti generali di indicizzazione. llms.txt e JSON-LD non garantiscono indicizzazione o citazioni. Fonte: [Google, AI features and your website](https://developers.google.com/search/docs/appearance/ai-features).

FAQPage rimane una descrizione semantica delle domande visibili. Google ha dismesso i rich result FAQ dal 7 maggio 2026 e chiarisce che llms.txt non modifica positivamente o negativamente il ranking. Fonte: [aggiornamenti Search Central di maggio/giugno 2026](https://developers.google.com/search/updates).

VacationRental è una specializzazione di LodgingBusiness coerente con questo appartamento; l’accesso alla specifica esperienza Google Vacation Rentals richiede anche requisiti e integrazioni esterne allo schema. Fonti: [Schema.org VacationRental](https://schema.org/VacationRental), [Google Vacation Rental](https://developers.google.com/search/docs/appearance/structured-data/vacation-rental).

Dopo la pubblicazione, verificare risposte HTTP e possibili blocchi CDN/WAF ai crawler, quindi controllare gli URL con Search Console. Queste verifiche live non sono state eseguite e non si presume alcuna indicizzazione già avvenuta.
