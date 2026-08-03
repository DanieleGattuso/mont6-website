/**
 * Chi digita mont6cefalu.it con il browser in inglese finisce su /en/.
 *
 * Regole, in ordine:
 *  1. Solo la home "/" viene toccata. Tutto il resto passa liscio.
 *  2. Una scelta esplicita dal selettore lingua (?lang=) vince su tutto e
 *     viene ricordata per un anno: chi vuole l'italiano non deve rifare la
 *     scelta a ogni visita, altrimenti resterebbe intrappolato in inglese.
 *  3. I crawler non vengono mai reindirizzati: Google deve poter vedere e
 *     indicizzare entrambe le versioni (ci pensa hreflang a smistare).
 *  4. Alla prima visita si guarda Accept-Language: si redirige solo se la
 *     prima preferenza NON e' l'italiano.
 * Il redirect e' 302 (temporaneo) con Vary, cosi' nessuna cache lo fissa.
 */

const BOT = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|embed|preview|lighthouse|headlesschrome/i;

/** Decisione pura, cosi' e' collaudabile senza Cloudflare: vedi scripts/check-lang.js */
export function decide({ pathname, langParam, cookie = '', acceptLanguage = '', userAgent = '' }) {
    if (pathname !== '/') return 'pass';

    if (langParam === 'it') return 'pass-remember-it';
    if (langParam === 'en') return 'redirect-remember-en';

    const remembered = (/mont6_lang=(it|en)/.exec(cookie) || [])[1];
    if (remembered === 'en') return 'redirect';
    if (remembered === 'it') return 'pass';

    if (BOT.test(userAgent)) return 'pass';

    // Prima lingua dichiarata dal browser, es. "en-GB,en;q=0.9,it;q=0.8"
    const first = acceptLanguage.toLowerCase().split(',')[0].trim();
    if (!first || first.startsWith('it')) return 'pass';
    return first.startsWith('en') ? 'redirect' : 'pass';
}

const COOKIE = (lang) => `mont6_lang=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`;

function redirectToEn(origin, setCookie) {
    const headers = new Headers({
        Location: `${origin}/en/`,
        'Cache-Control': 'no-store',
        Vary: 'Accept-Language, Cookie',
    });
    if (setCookie) headers.append('Set-Cookie', COOKIE('en'));
    return new Response(null, { status: 302, headers });
}

export async function onRequest(context) {
    const { request, next } = context;
    try {
        const url = new URL(request.url);
        const action = decide({
            pathname: url.pathname,
            langParam: url.searchParams.get('lang'),
            cookie: request.headers.get('cookie') || '',
            acceptLanguage: request.headers.get('accept-language') || '',
            userAgent: request.headers.get('user-agent') || '',
        });

        if (action === 'redirect') return redirectToEn(url.origin, false);
        if (action === 'redirect-remember-en') return redirectToEn(url.origin, true);

        const response = await next();
        if (action === 'pass-remember-it') {
            const res = new Response(response.body, response);
            res.headers.append('Set-Cookie', COOKIE('it'));
            res.headers.append('Vary', 'Accept-Language, Cookie');
            return res;
        }
        if (url.pathname === '/') {
            const res = new Response(response.body, response);
            res.headers.append('Vary', 'Accept-Language, Cookie');
            return res;
        }
        return response;
    } catch (e) {
        // Un errore qui non deve mai far cadere il sito: si serve la pagina
        console.error('Errore middleware lingua:', e);
        return next();
    }
}
