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

(async () => {
    const mod = await import(pathToFileURL(path.join(__dirname, '..', 'functions', '_middleware.js')).href);
    let falliti = 0;
    for (const [nome, input, atteso] of CASI) {
        const esito = mod.decide(input);
        const ok = esito === atteso;
        if (!ok) falliti++;
        console.log(`${ok ? 'ok  ' : 'FAIL'}  ${nome}${ok ? '' : `  -> ${esito}, atteso ${atteso}`}`);
    }
    console.log(`\n${CASI.length - falliti}/${CASI.length} controlli superati`);
    process.exit(falliti ? 1 : 0);
})();
