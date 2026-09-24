const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { renderLanguage } = require('./localize-html');
const root = path.join(__dirname,'..');
const read = file => fs.readFileSync(path.join(root,file),'utf8');

test('language build removes nested translations, including duplicate IDs', () => {
    const source = '<div><span class="lang-it">Totale <strong id="total">10</strong></span><span class="lang-en">Total <strong id="total">10</strong></span></div>';
    assert.equal(renderLanguage(source,'it'),'<div><span>Totale <strong id="total">10</strong></span></div>');
    assert.equal(renderLanguage(source,'en'),'<div><span>Total <strong id="total">10</strong></span></div>');
});
test('accessible attributes and native select labels work before JavaScript', () => {
    const source='<img alt="La casa" data-alt-en="The apartment"><select><option value="2" data-it="2 ospiti" data-en="2 guests">2 ospiti</option></select>';
    assert.equal(renderLanguage(source,'en'),'<img alt="The apartment"><select><option value="2">2 guests</option></select>');
});
test('broken source markup fails the build instead of dropping content', () => {
    assert.throws(()=>renderLanguage('<div><span class="lang-it">Test</div>','en'),/Unbalanced/);
});
test('legacy Stripe return redirects preserve the session, language and query', () => {
    const script=read('lang-init.js');
    for(const [pathname,lang,q,expected] of [
        ['/success.html','it','en','/en/success.html'],
        ['/success','it','en','/en/success'],
        ['/en/success','en','it','/success'],
        ['/en/success','en','en',null],
        ['/privacy','it','en','/en/privacy'],
    ]) {
        let redirected;
        const search=`?session_id=cs_test_unchanged&lang=${q}`;
        vm.runInNewContext(script,{URLSearchParams,location:{pathname,search,hash:'#details',replace:value=>redirected=value},document:{documentElement:{getAttribute:()=>lang}}});
        assert.equal(redirected,expected?expected+search+'#details':undefined);
    }
});
test('published documents have one language, one h1 and complete metadata', () => {
    const titles=new Set(), descriptions=new Set();
    for(const file of ['index.html','en/index.html','privacy.html','en/privacy.html','success.html','en/success.html','404.html','en/404.html']) {
        const html=read(file), lang=file.startsWith('en/')?'en':'it';
        assert.equal((html.match(/<h1\b/g)||[]).length,1,file);
        assert.doesNotMatch(html,new RegExp(`class="[^"]*\\blang-${lang==='en'?'it':'en'}\\b`),file);
        assert.doesNotMatch(html,/data-(?:alt|aria-label|placeholder)-(?:it|en)=/);
        const title=html.match(/<title>([^<]+)<\/title>/)[1];
        const description=html.match(/name="description" content="([^"]+)"/)[1];
        assert.ok(!titles.has(title)&&!descriptions.has(description),file);
        titles.add(title);descriptions.add(description);
        assert.ok(html.includes(`property="og:title" content="${title}"`)&&html.includes(`property="og:description" content="${description}"`),file);
        const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
        assert.equal(ids.length,new Set(ids).size,file);
    }
});
test('schema describes the apartment and visible FAQs, never a fabricated booking', () => {
    for(const file of ['index.html','en/index.html']) {
        const data=[...read(file).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
        const rental=data.find(d=>d['@type']==='VacationRental');
        assert.equal(rental.identifier,'IT082027C2YCA7QI4V');
        assert.equal(rental.containsPlace.occupancy.value,2);
        assert.equal(rental['@id'], 'https://mont6cefalu.it/#apartment');
        assert.ok(rental.mainEntityOfPage['@id'].endsWith('#webpage'));
        assert.ok(!rental.aggregateRating&&!rental.review);
        assert.equal(data.find(d=>d['@type']==='FAQPage').mainEntity.length,8);
        assert.ok(!data.some(d=>d['@type']==='LodgingReservation'));
    }
});
test('scroll enhancement is optional with no observer or reduced motion', () => {
    const source=read('app.js');
    const start=source.indexOf('function initScrollReveal()');
    const end=source.indexOf('function initSmoothScroll()',start);
    const fn=source.slice(start,end)+'\ninitScrollReveal();';
    // If either guard fails this throws on constructing an observer or touching a node.
    for(const reduced of [false,true]) vm.runInNewContext(fn,{
        document:{querySelectorAll:()=>[]},
        window:{...(reduced?{IntersectionObserver:function(){}}:{}),matchMedia:()=>({matches:reduced})},
    });
});

// Exercise the real booking form with DOM/Flatpickr fixtures and no live calls.
async function bookingFixture(lang) {
    const { pathToFileURL } = require('node:url');
    const rules = await import(pathToFileURL(path.join(root, 'booking-rules.js')).href);
    const ids = ['date-range', 'guest-count', 'btn-request-whatsapp', 'btn-request-stripe',
        'dynamicPriceBox', 'priceNightly', 'priceTotal', 'priceNights', 'taxAmount', 'taxAmountEn', 'form-msg'];
    const elements = Object.fromEntries(ids.map(id => {
        const classes = new Set();
        return [id, { value: id === 'guest-count' ? '2' : '', textContent: '', innerHTML: '', disabled: false,
            classList: { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name) },
            handlers: {}, addEventListener(type, handler) { this.handlers[type] = handler; }, focus() {} }];
    }));
    const calls = [], opened = [];
    let options, fp;
    const source = read('app.js');
    vm.runInNewContext(source.slice(source.indexOf('const MESI ='), source.indexOf('function initFAQ()')) + '\ninitBookingForm();', {
        ...rules, Date, console, AbortSignal, URL, crypto,
        document: { getElementById: id => elements[id] || null, documentElement: { getAttribute: () => lang } },
        window: { innerWidth: 390, addEventListener() {}, open: url => opened.push(url), location: {} },
        sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
        flatpickr(input, config) {
            options = config;
            fp = { selectedDates: [], set() {}, redraw() {} };
            return fp;
        },
        async fetch(url, opts) {
            calls.push({ url, opts });
            if (url === '/prezzi.json') return { ok: true, json: async () => JSON.parse(read('prezzi.json')) };
            if (url.startsWith('/api/get-booked-dates')) return { ok: true, json: async () => ({ ranges: [], partial: false }) };
            if (url === '/api/create-checkout-session') return { ok: false, json: async () => ({ error: 'Offline fixture' }) };
            throw new Error(`Unexpected request: ${url}`);
        },
    });
    await new Promise(setImmediate);
    const local = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
    return { elements, calls, opened, select(start, end) {
        fp.selectedDates = [local(start), local(end)];
        const display = iso => iso.split('-').reverse().join('/');
        elements['date-range'].value = display(start) + (lang === 'en' ? ' to ' : ' al ') + display(end);
        options.onChange(fp.selectedDates);
    } };
}

test('booking form rejects short summer stays before WhatsApp or payment in both languages', async () => {
    for (const lang of ['it', 'en']) for (const [start, end] of [
        ['2030-06-30', '2030-07-02'], ['2030-07-10', '2030-07-12'], ['2030-08-31', '2030-09-02'],
    ]) {
        const form = await bookingFixture(lang);
        form.select(start, end);
        assert.equal(form.elements.dynamicPriceBox.classList.contains('visible'), false);
        assert.ok(form.elements['form-msg'].textContent.includes(lang === 'en' ? '3 nights' : '3 notti'));
        form.elements['btn-request-whatsapp'].handlers.click();
        await form.elements['btn-request-stripe'].handlers.click();
        assert.equal(form.opened.length, 0);
        assert.equal(form.calls.filter(c => c.url === '/api/create-checkout-session').length, 0);
    }
});

test('booking form accepts exact minimum, exclusive checkout, year and DST boundaries', async () => {
    for (const [start, end] of [
        ['2030-06-29', '2030-07-01'], ['2030-06-30', '2030-07-03'],
        ['2030-08-31', '2030-09-03'], ['2030-09-01', '2030-09-03'],
        ['2030-12-31', '2031-01-02'], ['2030-03-30', '2030-04-01'], ['2030-10-26', '2030-10-28'],
    ]) {
        const form = await bookingFixture('en');
        form.select(start, end);
        assert.equal(form.elements.dynamicPriceBox.classList.contains('visible'), true, `${start}/${end}`);
        form.elements['btn-request-whatsapp'].handlers.click();
        assert.equal(form.opened.length, 1);
        await form.elements['btn-request-stripe'].handlers.click();
        assert.equal(form.calls.filter(c => c.url === '/api/create-checkout-session').length, 1);
    }
});

test('changing an invalid summer range to a valid range clears the minimum-stay notice', async () => {
    const form = await bookingFixture('it');
    form.select('2030-07-10', '2030-07-12');
    assert.equal(form.elements['form-msg'].classList.contains('visible'), true);
    form.select('2030-07-10', '2030-07-13');
    assert.equal(form.elements['form-msg'].classList.contains('visible'), false);
    assert.equal(form.elements.dynamicPriceBox.classList.contains('visible'), true);
});
