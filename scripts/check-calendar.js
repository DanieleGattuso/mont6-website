/**
 * Collaudo del calendario con disponibilita' finta e controllata, in locale,
 * PRIMA di pubblicare. Verifica la regola che vale soldi:
 *
 *   prenotazione A: notti +10..+12     buco: notti +13,+14     prenotazione B: notti +15..+17
 *
 * Il giorno +15 e' la prima notte di B, quindi NON puo' essere un arrivo, ma
 * DEVE poter essere una partenza: altrimenti il buco di due notti e' invendibile.
 *
 * Uso: node scripts/check-calendar.js
 */
const NPX = 'C:/Users/danie/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules';
const puppeteer = require(NPX + '/puppeteer-core');
const { Launcher } = require(NPX + '/chrome-launcher');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = 8199;
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
    '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json',
    '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' };

const iso = (offsetDays) => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + offsetDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const FIXTURE = [
    { from: iso(10), to: iso(12) },
    { from: iso(15), to: iso(17) },
];

const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    let file = path.join(ROOT, url === '/' ? 'index.html' : url.replace(/^\//, ''));
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!file.startsWith(ROOT) || !fs.existsSync(file)) {
        res.writeHead(404); return res.end('not found');
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
});

const results = [];
const check = (name, ok, detail) => {
    results.push(ok);
    console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
};

/** Clicca la cella del calendario di una data ISO. Ritorna false se non cliccabile. */
async function clickDay(page, isoDate) {
    return page.evaluate((target) => {
        const cells = [...document.querySelectorAll('.flatpickr-day')];
        const cell = cells.find((c) => {
            const d = c.dateObj;
            if (!d) return false;
            const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            return s === target;
        });
        if (!cell) return { found: false };
        const disabled = cell.classList.contains('flatpickr-disabled') || cell.classList.contains('notAllowed');
        if (!disabled) cell.click();
        return { found: true, disabled };
    }, isoDate);
}

(async () => {
    await new Promise((r) => server.listen(PORT, r));
    const browser = await puppeteer.launch({
        executablePath: Launcher.getFirstInstallation(), headless: 'new', args: ['--no-sandbox'],
    });

    for (const [lang, url] of [['it', `http://localhost:${PORT}/`], ['en', `http://localhost:${PORT}/en/`]]) {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 900 });
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (req.url().includes('/api/get-booked-dates')) {
                return req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ ranges: FIXTURE, partial: false }) });
            }
            req.continue();
        });
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.evaluate(() => document.getElementById('booking').scrollIntoView());
        await page.click('#date-range');
        await new Promise((r) => setTimeout(r, 500));

        // 1. una notte occupata non deve essere selezionabile come arrivo
        const occupied = await clickDay(page, iso(11));
        check(`[${lang}] notte occupata non selezionabile`, occupied.found && occupied.disabled);

        // 2. il primo giorno della prenotazione successiva: non selezionabile come arrivo...
        const asArrival = await clickDay(page, iso(15));
        check(`[${lang}] inizio prenotazione altrui non e' un arrivo valido`, asArrival.found && asArrival.disabled);

        // 3. ...ma DEVE esserlo come partenza, dopo aver scelto l'arrivo nel buco
        const gapStart = await clickDay(page, iso(13));
        check(`[${lang}] arrivo nel buco selezionabile`, gapStart.found && !gapStart.disabled);
        await new Promise((r) => setTimeout(r, 400));
        const asDeparture = await clickDay(page, iso(15));
        check(`[${lang}] partenza il giorno d'inizio della prenotazione successiva`,
            asDeparture.found && !asDeparture.disabled);

        await new Promise((r) => setTimeout(r, 600));
        const state = await page.evaluate(() => ({
            n: document.getElementById('date-range')._flatpickr.selectedDates.length,
            value: document.getElementById('date-range').value,
            price: document.getElementById('priceTotal').textContent,
            priceVisible: document.getElementById('dynamicPriceBox').classList.contains('visible'),
        }));
        check(`[${lang}] buco di 2 notti prenotabile`, state.n === 2 && state.priceVisible,
            `${state.value} = ${state.price}`);

        // 4. non si deve poter scavalcare una prenotazione
        await page.evaluate(() => document.getElementById('date-range')._flatpickr.clear());
        await new Promise((r) => setTimeout(r, 300));
        await clickDay(page, iso(13));
        await new Promise((r) => setTimeout(r, 300));
        const beyond = await clickDay(page, iso(18));
        check(`[${lang}] non si scavalca una prenotazione`, beyond.found && beyond.disabled);

        await page.close();
    }

    await browser.close();
    server.close();
    const failed = results.filter((r) => !r).length;
    console.log(`\n${results.length - failed}/${results.length} controlli superati`);
    process.exit(failed ? 1 : 0);
})().catch((e) => {
    console.error('errore collaudo:', e.message);
    server.close();
    process.exit(1);
});
