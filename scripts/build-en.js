/** Static HTML build. Edit templates/, then npm run build.
 * Both IT and EN are complete documents, even without JavaScript or CSS.
 * Prices, API handlers and checkout contracts are not changed by this build.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { renderLanguage } = require('./localize-html');
const ROOT = path.join(__dirname, '..');
const ORIGIN = 'https://mont6cefalu.it';
const read = name => fs.readFileSync(path.join(ROOT, 'templates', name), 'utf8');
const meta = {
    index: {
        it: ['Mont°6 — Appartamento nel centro storico di Cefalù | Prenotazione diretta', 'Un appartamento per due in Vicolo Monteleone: camera, cucina e travi a vista. Due minuti dal Duomo, cinque dalla spiaggia. Scegli le date e prenota con Daniele.'],
        en: ['Mont°6 — Apartment in Cefalù Old Town, Sicily | Book direct', 'An apartment for two in Vicolo Monteleone, with a bedroom, kitchen and exposed beams. Two minutes from the Cathedral, five from the beach. Book with Daniele.'],
    },
    privacy: {
        it: ['Mont°6 — Informativa su privacy e cookie', 'Come Mont°6 tratta i dati delle prenotazioni, i pagamenti tramite Stripe e i cookie essenziali. Informazioni e contatti per la tua privacy.'],
        en: ['Mont°6 — Privacy and cookie notice', 'How Mont°6 handles booking data, Stripe payments and essential cookies. Information and contact details for privacy enquiries.'],
    },
    success: {
        it: ['Mont°6 — Stato della prenotazione', 'Verifica lo stato del pagamento e della prenotazione del tuo soggiorno a Mont°6, Cefalù.'],
        en: ['Mont°6 — Booking status', 'Check the payment and booking status of your stay at Mont°6 in Cefalù.'],
    },
    '404': {
        it: ['Mont°6 — Pagina non trovata', 'La pagina richiesta non è disponibile. Torna al sito di Mont°6 o verifica le date per il tuo soggiorno a Cefalù.'],
        en: ['Mont°6 — Page not found', 'The page you requested is unavailable. Return to Mont°6 or check dates for your stay in Cefalù.'],
    },
};
const plain = text => text.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const urlFor = (page, lang) => `${ORIGIN}${lang === 'en' ? '/en' : ''}/${page === 'index' ? '' : page}`;
const absolutePaths = html => html
    .replace(/(href|src|data-bg|data-bg-lg)="(img\/|vendor\/|style\.css|app\.js|lang-init\.js|booking-status\.js)/g, '$1="/$2')
    .replace(/url\('img\//g, "url('/img/")
    .replace(/(srcset|imagesrcset)="([^"]+)"/g, (_, attr, val) => `${attr}="${val.replace(/(^|,\s*)(img\/|vendor\/)/g, '$1/$2')}"`);

function build(page, lang) {
    let html = read(`${page}.html`).replace('<!-- COOKIE_NOTICE -->', read('cookie-notice.html'));
    html = renderLanguage(html, lang)
        .replace('<html lang="it" data-lang="it">', `<html lang="${lang}" data-lang="${lang}">`);
    const [title, description] = meta[page][lang];
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
        .replace(/\s*<meta (?:name="(?:description|twitter:title|twitter:description)"|property="(?:og:title|og:description|og:url|og:locale|og:locale:alternate)") content="[^"]*">/g, '')
        .replace('</title>', `</title>
    <meta name="description" content="${description}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${urlFor(page,lang)}">
    <meta property="og:locale" content="${lang === 'en' ? 'en_GB' : 'it_IT'}">
    <meta property="og:locale:alternate" content="${lang === 'en' ? 'it_IT' : 'en_GB'}">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">`);
    html = html.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${urlFor(page,lang)}">`);
    if (lang === 'en') {
        html = html.replace(/href="\/privacy(?=["#])/g, 'href="/en/privacy')
            .replace(/href="\/" class="btn-luxe/g, 'href="/en/" class="btn-luxe')
            .replace('href="/" id="booking-home"', 'href="/en/" id="booking-home"')
            .replace('href="/#booking"', 'href="/en/#booking"')
            .replace(/<a class="lang-btn active" href="\/" hreflang="it" aria-current="true">IT<\/a>/g, '<a class="lang-btn" href="/" hreflang="it">IT</a>')
            .replace(/<a class="lang-btn" href="\/en\/" hreflang="en">EN<\/a>/g, '<a class="lang-btn active" href="/en/" hreflang="en" aria-current="true">EN</a>')
            .replace('content="Il soggiorno di Mont°6: travi a vista, maioliche siciliane e luce calda"', 'content="The living room at Mont°6: exposed beams, Sicilian tiles and warm light"');
    }
    if (page === 'index') {
        const faq = [...html.matchAll(/<button class="faq-question">([\s\S]*?)<span class="faq-icon">[\s\S]*?<div class="faq-answer">\s*<p>([\s\S]*?)<\/p>/g)]
            .map(([, q,a]) => ({ '@type':'Question', name:plain(q), acceptedAnswer:{'@type':'Answer', text:plain(a)} }));
        assert.equal(faq.length, 8, `${lang}: all visible FAQs included in schema`);
        html = html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (_, json) => {
            const data = JSON.parse(json);
            if (data['@type'] === 'VacationRental') {
                data.url = urlFor(page,lang);
                data.mainEntityOfPage = {'@type':'WebPage', '@id':urlFor(page,lang)+'#booking', inLanguage:lang};
                if (lang === 'en') {
                    data.description = 'Self-contained apartment in the pedestrian old town of Cefalù: one bedroom, one bathroom, an equipped kitchen, air conditioning and fibre Wi-Fi. Two minutes on foot from the Cathedral, five from the beach.';
                    data.priceRange = data.priceRange.replace('a notte', 'per night');
                }
                // Airbnb reviews remain visible and attributed, but are not
                // republished as first-party rating markup for Google.
                delete data.review;
                delete data.aggregateRating;
            }
            if (data['@type'] === 'FAQPage') { data.inLanguage=lang; data.mainEntity=faq; }
            return `<script type="application/ld+json">\n${JSON.stringify(data,null,4)}\n    </script>`;
        });
    }
    return absolutePaths(html).replace('<head>', '<head>\n    <!-- Generated by scripts/build-en.js. Edit templates/, then npm run build. -->');
}

function validate(html, page, lang) {
    assert.equal((html.match(/<h1\b/g)||[]).length, 1, `${page}/${lang}: one h1`);
    assert.ok(!html.includes(`class="lang-${lang === 'en' ? 'it' : 'en'}`), `${page}/${lang}: no other-language blocks`);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
    assert.equal(ids.length, new Set(ids).size, `${page}/${lang}: unique IDs`);
    let level=0;
    for (const match of html.matchAll(/<h([1-6])\b/g)) {
        const next=Number(match[1]);
        assert.ok(next<=level+1, `${page}/${lang}: heading h${level} -> h${next}`);
        level=next;
    }
    for (const match of html.matchAll(/(?:href|src|data-bg|data-bg-lg)="([^"]+)"/g)) {
        assert.match(match[1], /^(\/|https?:|#|data:|mailto:|tel:)/, `${page}/${lang}: absolute asset/link`);
    }
    for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(match[1]);
}

// Validate all documents before writing any output.
const outputs = [];
for (const page of Object.keys(meta)) for (const lang of ['it','en']) {
    const html=build(page,lang);
    validate(html,page,lang);
    outputs.push([`${lang==='en'?'en/':''}${page}.html`, html]);
}
// / remains the Italian canonical URL; /it/ is an explicit Italian alias.
outputs.push(['it/index.html', outputs.find(([file])=>file==='index.html')[1]]);
// Keep the original cascade and calendar CSS ready before Flatpickr initializes,
// without a second render-blocking stylesheet request on the home page.
const homeCss = '/* Generated by scripts/build-en.js. Edit style.css or vendor/flatpickr/flatpickr.min.css. */\n'
    + fs.readFileSync(path.join(ROOT, 'vendor/flatpickr/flatpickr.min.css'), 'utf8') + '\n'
    + fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
fs.writeFileSync(path.join(ROOT, 'home.css'), homeCss);
for (const [file,html] of outputs) {
    fs.mkdirSync(path.dirname(path.join(ROOT,file)),{recursive:true});
    fs.writeFileSync(path.join(ROOT,file),html);
}
console.log(`${outputs.length} static pages generated; language, headings, IDs, paths and JSON-LD checked.`);
