/**
 * Collaudo in browser vero (Chrome headless) delle due lingue.
 * Serve perche' il tool di anteprima non e' sempre disponibile: qui si guarda
 * cosa VEDE l'utente, non cosa c'e' nell'HTML.
 *
 * Uso:  node scripts/check-live.js [baseUrl]     (default: sito live)
 * Esce con codice 1 se un controllo fallisce.
 */
const NPX = 'C:/Users/danie/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules';
const puppeteer = require(NPX + '/puppeteer-core');
const { Launcher } = require(NPX + '/chrome-launcher');

const BASE = (process.argv[2] || 'https://mont6cefalu.it').replace(/\/$/, '');

/** Testo realmente visibile: esclude display:none, visibility:hidden e box a zero. */
const visibleText = () => {
    const out = [];
    const walk = (node) => {
        for (const el of node.children) {
            const cs = getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
            const r = el.getBoundingClientRect();
            if (r.width === 0 && r.height === 0) continue;
            if (!el.children.length) {
                const t = (el.textContent || '').trim();
                if (t) out.push(t);
            } else walk(el);
        }
    };
    walk(document.body);
    return out;
};

(async () => {
    const chromePath = Launcher.getFirstInstallation();
    if (!chromePath) throw new Error('Chrome non trovato');
    const browser = await puppeteer.launch({ executablePath: chromePath, headless: 'new', args: ['--no-sandbox'] });

    const results = [];
    const check = (name, ok, detail) => {
        results.push({ name, ok, detail });
        console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
    };

    for (const [lang, url] of [['it', BASE + '/'], ['en', BASE + '/en/']]) {
        const page = await browser.newPage();
        await page.setViewport({ width: 390, height: 844, isMobile: true });
        const errors = [];
        page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
        page.on('pageerror', (e) => errors.push(String(e)));
        const failed = [];
        page.on('response', (r) => {
            const ct = r.headers()['content-type'] || '';
            const u = r.url();
            // un asset che torna HTML = file mancante servito dal fallback
            if (/\.(webp|jpg|png|css|js|woff2)(\?|$)/.test(u) && ct.includes('text/html')) failed.push(u);
        });

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Le sezioni entrano con .reveal-up (opacity 0 finche' non le scorri):
        // senza questo giro la pagina sotto la piega risulterebbe "non visibile"
        // e i controlli passerebbero a vuoto.
        await page.evaluate(async () => {
            const step = window.innerHeight;
            for (let y = 0; y < document.body.scrollHeight; y += step) {
                window.scrollTo(0, y);
                await new Promise((r) => setTimeout(r, 250));
            }
            window.scrollTo(0, 0);
            await new Promise((r) => setTimeout(r, 400));
        });

        const texts = await page.evaluate(visibleText);
        const joined = texts.join(' | ');
        const htmlLang = await page.evaluate(() => document.documentElement.getAttribute('data-lang'));

        check(`[${lang}] data-lang corretto`, htmlLang === lang, htmlLang);
        check(`[${lang}] nessun asset servito come HTML`, failed.length === 0, failed.slice(0, 3).join(', '));
        check(`[${lang}] nessun errore in console`, errors.length === 0, errors.slice(0, 2).join(' / '));

        // immagini davvero caricate (naturalWidth > 0)
        const broken = await page.evaluate(() =>
            [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src)
        );
        check(`[${lang}] immagini caricate`, broken.length === 0, broken.slice(0, 3).join(', '));

        if (lang === 'en') {
            const italianLeft = ['Spiaggia', 'Ristoranti', 'Supermercato', 'Stazione FS', 'Ospiti', 'notte', 'Prenota']
                .filter((w) => new RegExp('(^|[^a-zA-Z])' + w + '([^a-zA-Z]|$)').test(joined));
            check('[en] nessuna parola italiana visibile', italianLeft.length === 0, italianLeft.join(', '));
            check('[en] testo inglese presente', /Two minutes|Beach|Restaurants/.test(joined));
        } else {
            check('[it] testo italiano presente', /Due passi|Spiaggia|Ristoranti/.test(joined));
        }

        // il calendario deve aprirsi con misure sane, non a tutto schermo.
        // Si apre via JS: aspettiamo che sia davvero aperto invece di sperare
        // in un ritardo fisso (altrimenti il test fallisce a caso).
        await page.evaluate(() => document.getElementById('booking').scrollIntoView());
        await page.click('#date-range').catch(() => {});
        await page
            .waitForFunction(() => {
                const c = document.querySelector('.flatpickr-calendar');
                return c && c.classList.contains('open') && c.getBoundingClientRect().width > 0;
            }, { timeout: 5000 })
            .catch(() => {});
        const cal = await page.evaluate(() => {
            const c = document.querySelector('.flatpickr-calendar');
            if (!c) return null;
            const r = c.getBoundingClientRect();
            return { w: Math.round(r.width), open: c.classList.contains('open'), nav: !!c.querySelector('.flatpickr-next-month') };
        });
        check(`[${lang}] calendario apre di misura giusta`, !!cal && cal.open && cal.w <= 400 && cal.nav, cal && `${cal.w}px`);

        // La barra fissa "Prenota ora" non deve coprire il calendario: su iPhone
        // rendeva non toccabile l'ultima riga di date.
        const sovrapposizione = await page.evaluate(() => {
            const c = document.querySelector('.flatpickr-calendar.open');
            const bar = document.getElementById('floatingCta');
            if (!c || !bar) return { ok: true };
            const visibile = getComputedStyle(bar).transform !== 'matrix(1, 0, 0, 1, 0, 0)'
                ? false
                : bar.classList.contains('visible');
            if (!visibile) return { ok: true };
            const a = c.getBoundingClientRect();
            const b = bar.getBoundingClientRect();
            const copre = a.bottom > b.top && a.top < b.bottom;
            return { ok: !copre, dettaglio: `calendario fino a ${Math.round(a.bottom)}px, barra da ${Math.round(b.top)}px` };
        });
        check(`[${lang}] la barra non copre il calendario`, sovrapposizione.ok, sovrapposizione.dettaglio);

        await page.close();
    }

    await browser.close();
    const failedChecks = results.filter((r) => !r.ok);
    console.log(`\n${results.length - failedChecks.length}/${results.length} controlli superati`);
    process.exit(failedChecks.length ? 1 : 0);
})().catch((e) => {
    console.error('errore collaudo:', e.message);
    process.exit(1);
});
