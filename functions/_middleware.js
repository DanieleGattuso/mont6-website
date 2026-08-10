/**
 * Chi digita mont6cefalu.it con il browser in inglese finisce su /en/.
 *
 * Prima di tutto il resto: chi arriva su www.mont6cefalu.it viene spostato sul
 * dominio nudo. Cloudflare serviva il sito intero a tutti e due gli indirizzi,
 * cioe' due copie complete online. Google non se n'era ancora accorto, ma era
 * questione di tempo: meglio una porta sola, e permanente.
 *
 * Regole della lingua, in ordine:
 *  1. Solo la home "/" viene toccata. Tutto il resto passa liscio.
 *  2. Chi arriva su "/" cliccando IT dalla pagina inglese ha scelto: il
 *     Referer dice /en/, quindi si serve l'italiano e si ricorda. Senza questa
 *     regola il visitatore col browser inglese verrebbe rispedito su /en/ e
 *     non riuscirebbe piu' a uscirne.
 *  3. Anche ?lang= resta una scelta esplicita (lo passa Stripe al ritorno dal
 *     checkout, e vale per i vecchi link in giro). Ricordata per un anno.
 *  4. I crawler non vengono mai reindirizzati: Google deve poter vedere e
 *     indicizzare entrambe le versioni (ci pensa hreflang a smistare).
 *  5. Alla prima visita si guarda Accept-Language: si redirige solo se la
 *     prima preferenza NON e' l'italiano.
 * Il redirect e' 302 (temporaneo) con Vary, cosi' nessuna cache lo fissa.
 *
 * Il selettore lingua punta agli indirizzi puliti ("/" e "/en/"): quelli con
 * ?lang= finivano nel rapporto di Search Console come pagina reindirizzata e
 * pagina alternativa: URL in piu' da far digerire a Google, per niente.
 */

const BOT = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|embed|preview|lighthouse|headlesschrome/i;

/**
 * L'indirizzo con www dove va a finire, o null se non c'e' niente da spostare.
 * Percorso e query restano quelli, senno' un link condiviso perde il pezzo che
 * conta. Pura apposta: vedi scripts/check-lang.js
 */
export function senzaWww({ hostname, pathname = '/', search = '' }) {
    if (!hostname || !hostname.startsWith('www.')) return null;
    return `https://${hostname.slice(4)}${pathname}${search}`;
}

/** Il click su IT arriva dalla pagina inglese dello stesso sito? */
function daPaginaInglese(referer, origin) {
    if (!referer || !origin || !referer.startsWith(origin)) return false;
    const resto = referer.slice(origin.length);
    return resto === '/en' || /^\/en[/?#]/.test(resto);
}

/** Decisione pura, cosi' e' collaudabile senza Cloudflare: vedi scripts/check-lang.js */
export function decide({ pathname, langParam, cookie = '', acceptLanguage = '', userAgent = '', referer = '', origin = '' }) {
    if (pathname !== '/') return 'pass';

    if (langParam === 'it') return 'pass-remember-it';
    if (langParam === 'en') return 'redirect-remember-en';

    // Vale come scelta esplicita, quindi batte anche il cookie "en" di prima
    if (daPaginaInglese(referer, origin)) return 'pass-remember-it';

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

function redirectToEn(url, setCookie) {
    // La query va conservata (utm_source e simili), tolto solo il nostro lang=
    const query = new URLSearchParams(url.search);
    query.delete('lang');
    const coda = query.toString();
    const headers = new Headers({
        Location: `${url.origin}/en/${coda ? '?' + coda : ''}`,
        'Cache-Control': 'no-store',
        Vary: 'Accept-Language, Cookie, Referer',
    });
    if (setCookie) headers.append('Set-Cookie', COOKIE('en'));
    return new Response(null, { status: 302, headers });
}

export async function onRequest(context) {
    const { request, next } = context;
    try {
        const url = new URL(request.url);

        // Il www esce di scena subito, prima di qualsiasi ragionamento sulla
        // lingua: quello lo fa poi il dominio nudo, una volta sola.
        // 308 se non e' una GET, cosi' il metodo e il corpo non si perdono:
        // oggi non dovrebbe capitare (dalle pagine www non ci si arriva piu'),
        // ma un POST trasformato in GET dal redirect fallirebbe in silenzio.
        const apex = senzaWww(url);
        if (apex) {
            const permanente = request.method === 'GET' || request.method === 'HEAD';
            return new Response(null, {
                status: permanente ? 301 : 308,
                headers: { Location: apex, 'Cache-Control': 'public, max-age=3600' },
            });
        }

        const action = decide({
            pathname: url.pathname,
            langParam: url.searchParams.get('lang'),
            cookie: request.headers.get('cookie') || '',
            acceptLanguage: request.headers.get('accept-language') || '',
            userAgent: request.headers.get('user-agent') || '',
            referer: request.headers.get('referer') || '',
            origin: url.origin,
        });

        if (action === 'redirect') return redirectToEn(url, false);
        if (action === 'redirect-remember-en') return redirectToEn(url, true);

        const response = await next();
        if (action === 'pass-remember-it') {
            const res = new Response(response.body, response);
            res.headers.append('Set-Cookie', COOKIE('it'));
            res.headers.append('Vary', 'Accept-Language, Cookie, Referer');
            return res;
        }
        if (url.pathname === '/') {
            const res = new Response(response.body, response);
            res.headers.append('Vary', 'Accept-Language, Cookie, Referer');
            return res;
        }
        return response;
    } catch (e) {
        // Un errore qui non deve mai far cadere il sito: si serve la pagina
        console.error('Errore middleware lingua:', e);
        return next();
    }
}
