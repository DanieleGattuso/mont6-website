/**
 * Collaudo della regola "browser in inglese -> /en/", senza bisogno di Cloudflare.
 * Prova la funzione decide() del middleware su tutti i casi che contano.
 * Uso: node scripts/check-lang.js
 */
const { pathToFileURL } = require('url');
const path = require('path');

const CASI = [
    // [descrizione, input, atteso]
    ['inglese UK sulla home', { pathname: '/', acceptLanguage: 'en-GB,en;q=0.9' }, 'redirect'],
    ['inglese US sulla home', { pathname: '/', acceptLanguage: 'en-US,en;q=0.9,es;q=0.8' }, 'redirect'],
    ['italiano sulla home', { pathname: '/', acceptLanguage: 'it-IT,it;q=0.9,en;q=0.8' }, 'pass'],
    ['tedesco: resta in italiano', { pathname: '/', acceptLanguage: 'de-DE,de;q=0.9' }, 'pass'],
    ['nessuna preferenza', { pathname: '/', acceptLanguage: '' }, 'pass'],

    ['scelta esplicita IT vince sul browser inglese',
        { pathname: '/', langParam: 'it', acceptLanguage: 'en-GB,en;q=0.9' }, 'pass-remember-it'],
    ['click su IT dalla pagina inglese: niente rimbalzo',
        { pathname: '/', referer: 'https://mont6cefalu.it/en/', origin: 'https://mont6cefalu.it',
            acceptLanguage: 'en-GB,en;q=0.9' }, 'pass-remember-it'],
    ['click su IT dalla privacy inglese',
        { pathname: '/', referer: 'https://mont6cefalu.it/en/privacy', origin: 'https://mont6cefalu.it',
            acceptLanguage: 'en-US' }, 'pass-remember-it'],
    ['click su IT batte anche il cookie inglese di prima',
        { pathname: '/', referer: 'https://mont6cefalu.it/en/', origin: 'https://mont6cefalu.it',
            cookie: 'mont6_lang=en', acceptLanguage: 'it-IT' }, 'pass-remember-it'],
    ['un sito esterno che si chiama /en/ non conta',
        { pathname: '/', referer: 'https://esempio.it/en/', origin: 'https://mont6cefalu.it',
            acceptLanguage: 'en-GB,en;q=0.9' }, 'redirect'],
    ['arrivo dalla home italiana: il browser inglese comanda ancora',
        { pathname: '/', referer: 'https://mont6cefalu.it/privacy', origin: 'https://mont6cefalu.it',
            acceptLanguage: 'en-GB,en;q=0.9' }, 'redirect'],
    ['nessun inganno da /enoteca',
        { pathname: '/', referer: 'https://mont6cefalu.it/enoteca', origin: 'https://mont6cefalu.it',
            acceptLanguage: 'en-GB,en;q=0.9' }, 'redirect'],
    ['scelta esplicita EN', { pathname: '/', langParam: 'en', acceptLanguage: 'it-IT' }, 'redirect-remember-en'],
    ['scelta ricordata IT batte il browser inglese',
        { pathname: '/', cookie: 'mont6_lang=it', acceptLanguage: 'en-GB,en;q=0.9' }, 'pass'],
    ['scelta ricordata EN con browser italiano',
        { pathname: '/', cookie: 'mont6_lang=en', acceptLanguage: 'it-IT,it;q=0.9' }, 'redirect'],

    ['Googlebot non viene mai reindirizzato',
        { pathname: '/', acceptLanguage: 'en-US', userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }, 'pass'],
    ['anteprima WhatsApp non reindirizzata',
        { pathname: '/', acceptLanguage: 'en-US', userAgent: 'WhatsApp/2.23' }, 'pass'],

    ['la pagina inglese non viene toccata', { pathname: '/en/', acceptLanguage: 'it-IT' }, 'pass'],
    ['le API non vengono toccate', { pathname: '/api/get-booked-dates', acceptLanguage: 'en-GB' }, 'pass'],
    ['la privacy non viene toccata', { pathname: '/privacy', acceptLanguage: 'en-GB' }, 'pass'],
];

/** Dove finisce chi arriva col www davanti. null = non lo si tocca. */
const CASI_WWW = [
    ['la home con www va sul dominio nudo',
        { hostname: 'www.mont6cefalu.it', pathname: '/', search: '' }, 'https://mont6cefalu.it/'],
    ['il www conserva percorso e query',
        { hostname: 'www.mont6cefalu.it', pathname: '/en/', search: '?utm_source=instagram' },
        'https://mont6cefalu.it/en/?utm_source=instagram'],
    ['anche le API col www vengono spostate',
        { hostname: 'www.mont6cefalu.it', pathname: '/api/get-booked-dates', search: '' },
        'https://mont6cefalu.it/api/get-booked-dates'],
    ['il dominio nudo non si tocca',
        { hostname: 'mont6cefalu.it', pathname: '/', search: '' }, null],
    ['l\'anteprima di Cloudflare non si tocca',
        { hostname: 'mont6-website.pages.dev', pathname: '/', search: '' }, null],
    ['niente inganni da un dominio che inizia per www',
        { hostname: 'wwwmont6cefalu.it', pathname: '/', search: '' }, null],
];

(async () => {
    const mod = await import(pathToFileURL(path.join(__dirname, '..', 'functions', '_middleware.js')).href);
    let falliti = 0;
    for (const [nome, input, atteso] of CASI_WWW) {
        const esito = mod.senzaWww(input);
        const ok = esito === atteso;
        if (!ok) falliti++;
        console.log(`${ok ? 'ok  ' : 'FAIL'}  ${nome}${ok ? '' : `  -> ${esito}, atteso ${atteso}`}`);
    }
    for (const [nome, input, atteso] of CASI) {
        const esito = mod.decide(input);
        const ok = esito === atteso;
        if (!ok) falliti++;
        console.log(`${ok ? 'ok  ' : 'FAIL'}  ${nome}${ok ? '' : `  -> ${esito}, atteso ${atteso}`}`);
    }
    const totale = CASI.length + CASI_WWW.length;
    console.log(`\n${totale - falliti}/${totale} controlli superati`);
    process.exit(falliti ? 1 : 0);
})();
