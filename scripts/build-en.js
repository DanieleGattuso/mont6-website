/**
 * Genera la versione inglese del sito in en/ partendo dai file italiani.
 * Una sola sorgente da mantenere: si scrive in index.html, questo file
 * ricava en/index.html. Lanciare `npm run build` dopo ogni modifica al copy.
 *
 * Perché due URL invece del vecchio toggle JS: Google indicizza una pagina per
 * lingua solo se ha un indirizzo suo. Con hreflang, agli inglesi mostra /en/.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'en');

/**
 * I percorsi relativi non valgono dentro /en/: diventano assoluti dalla root.
 * Attenzione a srcset/imagesrcset: contengono PIÙ percorsi separati da virgola,
 * non basta sistemare il primo. Se sfuggono, /en/img/... restituisce l'HTML di
 * fallback al posto del file e le immagini spariscono.
 */
function absolutePaths(html) {
    return html
        .replace(/(href|src)="(img\/|vendor\/|style\.css|app\.js|lang-init\.js|privacy\.html|success\.html)/g, '$1="/$2')
        .replace(/url\('img\//g, "url('/img/")
        .replace(/(srcset|imagesrcset)="([^"]+)"/g, (_, attr, value) =>
            `${attr}="${value.replace(/(^|,\s*)(img\/|vendor\/)/g, '$1/$2')}"`);
}

const EN_FAQ = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
        ['What are the check-in and check-out times at Mont°6 in Cefalù?',
            'Check-in is from 3:00 PM, check-out by 10:00 AM. Mont°6 has a digital lock, so you let yourself in at any time from 3:00 PM onwards.'],
        ['Where can I park near Mont°6 in the old town of Cefalù?',
            'The apartment is in the pedestrian old town. We recommend Parcheggio Coco on the seafront, about a five-minute walk away.'],
        ['Does Mont°6 accept pets?',
            'No. For hygiene and regulatory reasons pets cannot stay at the apartment.'],
        ['Are linens and towels included?',
            'Yes: bed linen, towels and a set of toiletries are always included in the price, along with a few breakfast basics.'],
        ['What is the minimum stay at Mont°6?',
            'Two nights. In high season (July and August) three nights may be required. Rates run from €90 to €220 a night depending on the month.'],
        ['Is it cheaper to book Mont°6 directly?',
            'Yes. Booking direct on mont6cefalu.it saves up to 15% against the portals, which add booking and service fees. You also get a bottle of Sicilian wine on arrival and flexible check-in and check-out times when the apartment is free.'],
    ].map(([q, a]) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
    })),
};

function buildIndex() {
    let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

    html = html
        .replace('<html lang="it" data-lang="it">', '<html lang="en" data-lang="en">')
        .replace(
            /<title>[^<]*<\/title>/,
            '<title>Mont°6 — Apartment in the Old Town of Cefalù, Sicily | Book Direct</title>'
        )
        .replace(
            /<meta name="description" content="[^"]*">/,
            '<meta name="description" content="Self-contained apartment in the old town of Cefalù: two minutes on foot from the Cathedral, five from the beach. One bedroom, air conditioning, proper kitchen. From €90 a night, booked direct with no fees.">'
        )
        .replace('<link rel="canonical" href="https://mont6cefalu.it/">', '<link rel="canonical" href="https://mont6cefalu.it/en/">')
        .replace('<meta property="og:url" content="https://mont6cefalu.it">', '<meta property="og:url" content="https://mont6cefalu.it/en/">')
        .replace(
            '<meta property="og:title" content="Mont°6 — Appartamento nel centro storico di Cefalù">',
            '<meta property="og:title" content="Mont°6 — Apartment in the old town of Cefalù">'
        )
        .replace(
            '<meta property="og:description" content="Due minuti dal Duomo, cinque dalla spiaggia. Prenotazione diretta, senza commissioni.">',
            '<meta property="og:description" content="Two minutes from the Cathedral, five from the beach. Book direct, no booking fees.">'
        )
        .replace(
            '<meta name="twitter:title" content="Mont°6 — Appartamento nel centro storico di Cefalù">',
            '<meta name="twitter:title" content="Mont°6 — Apartment in the old town of Cefalù">'
        )
        .replace(
            '<meta name="twitter:description" content="Due minuti dal Duomo, cinque dalla spiaggia. Prenotazione diretta.">',
            '<meta name="twitter:description" content="Two minutes from the Cathedral, five from the beach. Book direct.">'
        )
        .replace('<meta property="og:image:alt" content="Il soggiorno di Mont°6: travi a vista, maioliche siciliane e luce calda">',
                 '<meta property="og:image:alt" content="The living room at Mont°6: exposed beams, Sicilian tiles and warm light">')
        .replace('"priceRange": "€90 - €220 a notte",', '"priceRange": "€90 - €220 per night",')
        .replace('<meta property="og:locale" content="it_IT">', '<meta property="og:locale" content="en_GB">')
        .replace('<meta property="og:locale:alternate" content="en_GB">', '<meta property="og:locale:alternate" content="it_IT">');

    // Selettore lingua: su /en/ è EN a essere attivo
    html = html
        .replace(/<a class="lang-btn active" href="\/" hreflang="it" aria-current="true">IT<\/a>/g,
            '<a class="lang-btn" href="/" hreflang="it">IT</a>')
        .replace(/<a class="lang-btn" href="\/en\/" hreflang="en">EN<\/a>/g,
            '<a class="lang-btn active" href="/en/" hreflang="en" aria-current="true">EN</a>');

    // Dati strutturati: lingua, URL e FAQ in inglese
    html = html
        .replace('"url": "https://mont6cefalu.it",', '"url": "https://mont6cefalu.it/en/",\n        "inLanguage": "en",')
        .replace(
            /"description": "Appartamento indipendente[^"]*",/,
            '"description": "Self-contained apartment in the pedestrian old town of Cefalù: one bedroom, one bathroom, a proper kitchen, air conditioning and fibre Wi-Fi. Two minutes on foot from the Cathedral, five from the beach.",'
        )
        .replace(
            /<script type="application\/ld\+json">\s*\{\s*"@context": "https:\/\/schema\.org",\s*"@type": "FAQPage"[\s\S]*?<\/script>/,
            '<script type="application/ld+json">\n' + JSON.stringify(EN_FAQ, null, 4) + '\n    </script>'
        );

    html = absolutePaths(html);
    // Dalla pagina inglese si va alla privacy inglese
    html = html.replace(/href="\/privacy\.html"/g, 'href="/en/privacy.html"');
    html = html.replace('<head>', '<head>\n    <!-- Generato da scripts/build-en.js: non modificare a mano, si scrive in /index.html -->');

    return html;
}

function buildPrivacy() {
    let html = fs.readFileSync(path.join(ROOT, 'privacy.html'), 'utf8');
    html = html
        .replace('<html lang="it" data-lang="it">', '<html lang="en" data-lang="en">')
        .replace(/<title>[^<]*<\/title>/, '<title>Mont°6 — Privacy Policy</title>')
        // "Torna alla home" da /en/privacy.html deve portare alla home inglese
        .replace('href="index.html"', 'href="/en/"')
        // canonical proprio: e' la stessa pagina a due indirizzi
        .replace('<link rel="canonical" href="https://mont6cefalu.it/privacy">',
                 '<link rel="canonical" href="https://mont6cefalu.it/en/privacy">');
    return absolutePaths(html);
}

/**
 * Da /en/ ogni percorso relativo punta dentro /en/, dove non c'è nulla:
 * Cloudflare risponde 200 con l'HTML di fallback e il browser si trova una
 * pagina al posto di un'immagine o di un foglio di stile. Qui elenchiamo
 * ogni riferimento che non parte da "/" o da un protocollo.
 */
function relativeRefs(html) {
    const bad = [];
    const push = (v) => {
        const t = v.trim();
        if (t && !/^(\/|https?:|#|data:|mailto:|tel:|whatsapp:)/.test(t)) bad.push(t);
    };
    for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) push(m[1]);
    for (const m of html.matchAll(/(?:srcset|imagesrcset)="([^"]+)"/g)) {
        m[1].split(',').forEach((part) => push(part.trim().split(/\s+/)[0]));
    }
    for (const m of html.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)) push(m[1]);
    return [...new Set(bad)];
}

const out = buildIndex();
const outPrivacy = buildPrivacy();

// I controlli girano PRIMA di scrivere: una build fallita non deve lasciare
// su disco file rotti pronti per il "git add ." di pubblica.bat.
const relIndex = relativeRefs(out);
const relPrivacy = relativeRefs(outPrivacy);
const checks = [
    ['lang inglese', out.includes('<html lang="en" data-lang="en">')],
    ['canonical /en/', out.includes('href="https://mont6cefalu.it/en/"')],
    ['hreflang presenti', (out.match(/rel="alternate" hreflang/g) || []).length === 3],
    ['nessun percorso relativo (index)', relIndex.length === 0, relIndex.join(', ')],
    ['nessun percorso relativo (privacy)', relPrivacy.length === 0, relPrivacy.join(', ')],
    ['FAQ in inglese', out.includes('What are the check-in and check-out times')],
    ['switcher EN attivo', out.includes('class="lang-btn active" href="/en/"')],
];
const failed = checks.filter(([, ok]) => !ok);
failed.forEach(([name, , detail]) => console.error('FALLITO: ' + name + (detail ? ' -> ' + detail : '')));
if (failed.length) {
    console.error('Build interrotta: en/ non e stato toccato.');
    process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'index.html'), out);
fs.writeFileSync(path.join(OUT_DIR, 'privacy.html'), outPrivacy);
console.log('en/index.html + en/privacy.html generati (' + checks.length + ' controlli ok)');
