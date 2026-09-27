const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'analytics.js'), 'utf8');
const CONSENT = 'mont6_analytics_consent_v1';
const PURCHASES = 'mont6_analytics_purchases_v1';
const CAMPAIGN = 'mont6_analytics_campaign_v1';
const AGE = 180 * 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 27);

function harness(options = {}) {
    let now = NOW;
    const local = options.local || new Map();
    const session = options.session || new Map();
    const cookies = new Map([['_ga', 'old-value'], ['_ga_G63SNBBC39', 'old-session'], ['essential_booking', 'keep']]);
    const addedScripts = [];
    const handlers = {};
    const storage = map => ({
        getItem(key) { if (options.storageThrows) throw Error('Storage unavailable'); return map.get(key) || null; },
        setItem(key, value) { if (options.storageThrows) throw Error('Storage unavailable'); map.set(key, value); },
        removeItem(key) { if (options.storageThrows) throw Error('Storage unavailable'); map.delete(key); }
    });
    const window = {
        localStorage: storage(local), sessionStorage: storage(session),
        addEventListener(name, callback) { (handlers[name] ||= []).push(callback); },
        dispatchEvent(event) { for (const callback of handlers[event.type] || []) callback(event); }
    };
    const document = {
        querySelector: () => options.unconfigured ? null : { content: 'G-G63SNBBC39' },
        referrer: options.referrer || '',
        createElement: () => ({ remove() { this.removed = true; } }),
        head: { appendChild(script) { if (options.scriptThrows) throw Error('Blocked'); addedScripts.push(script); } },
        get cookie() { return [...cookies].map(([key, value]) => `${key}=${value}`).join('; '); },
        set cookie(value) { cookies.delete(value.split('=')[0]); }
    };
    const location = new URL(options.url || 'https://mont6cefalu.it/');
    class TestDate extends Date { static now() { return now; } }
    vm.runInNewContext(source, { window, document, location, URL, URLSearchParams, Date: TestDate,
        setTimeout: () => 1, clearTimeout: () => {}, CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail; } } });
    return { api: window.Mont6Analytics, window, document, addedScripts, local, session, cookies,
        advance(ms) { now += ms; },
        messages() { return (window.mont6DataLayer || []).map(args => Array.from(args)); },
        events() { return this.messages().filter(args => args[0] === 'event'); },
        storageChanged(key = CONSENT) { window.dispatchEvent({ type: 'storage', key }); }
    };
}

test('no Google script, event queue or optional storage before consent or after rejection', () => {
    const h = harness({ url: 'https://mont6cefalu.it/?utm_campaign=estate_2027&utm_source=instagram' });
    assert.equal(h.api.getConsent(), null);
    assert.equal(h.addedScripts.length, 0);
    assert.equal(h.window.mont6DataLayer, undefined);
    assert.equal(h.session.has(CAMPAIGN), false);
    assert.equal(h.api.track('contact_request', { method: 'whatsapp', placement: 'booking' }), false);
    h.api.setConsent('rejected');
    assert.equal(h.api.getConsent(), 'rejected');
    assert.equal(h.addedScripts.length, 0);
    assert.equal(h.events().length, 0);
    assert.equal(h.api.track('page_view'), false);
    const reload = harness({ local: h.local, session: h.session });
    assert.equal(reload.api.getConsent(), 'rejected');
    assert.equal(reload.addedScripts.length, 0);
});

test('legacy acknowledgement, expired, invalid and future choices never enable analytics', () => {
    for (const value of [null, { choice: 'accepted', at: NOW - AGE }, { choice: 'accepted', at: NOW + 10000 }, { choice: true, at: NOW }, 'accepted']) {
        const local = new Map([['mont6_cookie_accepted', 'true']]);
        if (value) local.set(CONSENT, JSON.stringify(value));
        const h = harness({ local });
        assert.equal(h.api.getConsent(), null);
        assert.equal(h.addedScripts.length, 0);
    }
});

test('explicit opt-in loads once, denies all advertising and uses a fixed 180-day cookie expiry', () => {
    const h = harness();
    h.api.setConsent('accepted');
    h.api.setConsent('accepted');
    assert.equal(h.addedScripts.length, 1);
    assert.equal(h.addedScripts[0].referrerPolicy, 'origin');
    assert.equal(h.api.isEnabled(), true);
    const consent = h.messages().find(args => args[0] === 'consent')[2];
    assert.equal(consent.analytics_storage, 'granted');
    for (const key of ['ad_storage', 'ad_user_data', 'ad_personalization']) assert.equal(consent[key], 'denied');
    const config = h.messages().find(args => args[0] === 'config')[2];
    assert.equal(config.send_page_view, false);
    assert.equal(config.cookie_expires, 15552000);
    assert.equal(config.cookie_update, false);
    assert.equal(config.allow_google_signals, false);
    assert.equal(config.allow_ad_personalization_signals, false);
    assert.equal(h.events().filter(args => args[1] === 'page_view').length, 1);
});

test('URL queries, fragments, sensitive inputs and unknown campaign values cannot reach the data layer', () => {
    const h = harness({
        url: 'https://mont6cefalu.it/en/success?session_id=cs_live_SECRET&email=guest%40example.com&utm_campaign=estate_2027&utm_source=instagram&utm_medium=organic_social&utm_content=guest%40example.com#private',
        referrer: 'https://checkout.stripe.com/c/pay/cs_live_REFERRER?email=private%40example.com'
    });
    h.api.setConsent('accepted');
    assert.equal(h.api.track('begin_checkout', { value: 1020, currency: 'EUR', name: 'PERSONAL_NAME', email: 'guest@example.com', dates: '2027-07-01', items: [{ item_name: 'PERSONAL_NAME' }] }), true);
    const data = JSON.stringify(h.messages());
    assert.doesNotMatch(data, /cs_live|SECRET|guest|PERSONAL_NAME|REFERRER|2027-07-01|private|session_id/);
    for (const event of h.events()) {
        assert.equal(event[2].page_location, 'https://mont6cefalu.it/en/success');
        assert.equal(event[2].page_referrer, 'https://checkout.stripe.com');
        assert.equal(event[2].campaign_source, 'instagram');
        assert.equal(event[2].campaign_content, undefined);
    }
    const unknown = harness({ url: 'https://mont6cefalu.it/guest@example.com?utm_campaign=NAME&utm_source=PERSON' });
    unknown.api.setConsent('accepted');
    assert.equal(unknown.events()[0][2].page_location, 'https://mont6cefalu.it/404');
    assert.doesNotMatch(JSON.stringify(unknown.messages()), /example\.com|NAME|PERSON/);
});

test('purchase uses only safe order identity/value and deduplicates across page loads', () => {
    const h = harness();
    h.api.setConsent('accepted');
    const purchase = { transaction_id: 'mont6_123', value: 1050, currency: 'EUR' };
    assert.equal(h.api.track('purchase', purchase), true);
    assert.equal(h.api.track('purchase', purchase), false);
    assert.equal(h.api.track('purchase', { ...purchase, transaction_id: 'mont6_cs_live_secret' }), false);
    assert.equal(h.api.track('purchase', { ...purchase, transaction_id: 'mont6_NomeCognome' }), false);
    assert.equal(h.api.track('purchase', { ...purchase, transaction_id: 'mont6_124', value: NaN }), false);
    const reload = harness({ local: h.local, session: h.session });
    assert.equal(reload.api.track('purchase', purchase), false);
    assert.equal(reload.api.track('purchase', { ...purchase, transaction_id: 'mont6_124' }), true);
    assert.equal(reload.events().filter(args => args[1] === 'purchase').length, 1);
    assert.equal(reload.events().at(-1)[2].items[0].item_id, 'mont6_stay');
});

test('payment return excludes only the exact Stripe checkout referrer and preserves organic attribution', () => {
    for (const [referrer, excluded] of [
        ['https://checkout.stripe.com/c/pay/cs_live_PRIVATE', true],
        ['https://www.google.com/search?q=Mont6', false],
        ['https://www.bing.com/search?q=Mont6', false],
        ['https://checkout.stripe.com.other.example/', false],
        ['https://other.example/?return=https://checkout.stripe.com', false]
    ]) {
        const h = harness({ url: 'https://mont6cefalu.it/success?session_id=cs_live_PRIVATE', referrer });
        h.api.setConsent('accepted');
        h.api.track('purchase', { transaction_id: 'mont6_123', value: 1050, currency: 'EUR' });
        const contexts = [
            h.messages().find(args => args[0] === 'set')[1],
            h.messages().find(args => args[0] === 'config')[2],
            ...h.events().map(args => args[2])
        ];
        for (const context of contexts) {
            assert.equal(context.page_referrer, new URL(referrer).origin);
            assert.equal(Object.hasOwn(context, 'ignore_referrer'), excluded);
            if (excluded) assert.equal(context.ignore_referrer, true);
        }
        assert.doesNotMatch(JSON.stringify(h.messages()), /cs_live_PRIVATE|session_id|\?q=/);
    }
});

test('revocation disables Google, clears optional cookies and storage, and preserves booking storage', () => {
    const session = new Map([['mont6_booking', 'KEEP_BOOKING']]);
    const h = harness({ session, url: 'https://mont6cefalu.it/?utm_campaign=estate_2027&utm_source=facebook' });
    h.api.setConsent('accepted');
    h.cookies.set('_ga', 'analytics');
    h.cookies.set('_ga_G63SNBBC39', 'analytics-session');
    h.api.track('purchase', { transaction_id: 'mont6_123', value: 1050, currency: 'EUR' });
    h.api.revoke();
    assert.equal(h.api.getConsent(), 'rejected');
    assert.equal(h.window['ga-disable-G-G63SNBBC39'], true);
    assert.equal(h.addedScripts[0].removed, true);
    assert.equal(h.addedScripts.length, 1);
    assert.equal(h.events().length, 0);
    assert.equal(h.api.track('page_view'), false);
    assert.equal(h.local.has(PURCHASES), false);
    assert.equal(h.session.has(CAMPAIGN), false);
    assert.equal(h.session.get('mont6_booking'), 'KEEP_BOOKING');
    assert.deepEqual([...h.cookies], [['essential_booking', 'keep']]);
});

test('revocation in another tab and expiration immediately block further events', () => {
    const h = harness();
    h.api.setConsent('accepted');
    h.local.set(CONSENT, JSON.stringify({ choice: 'rejected', at: NOW }));
    h.storageChanged();
    assert.equal(h.api.track('page_view'), false);
    h.api.setConsent('accepted');
    h.advance(AGE);
    assert.equal(h.api.track('page_view'), false);
    assert.equal(h.api.getConsent(), null);
    assert.equal(h.window['ga-disable-G-G63SNBBC39'], true);
});

test('blocked storage, script failures, malformed events and preview hosts cannot break booking callers', () => {
    const unavailable = harness({ storageThrows: true });
    assert.doesNotThrow(() => unavailable.api.setConsent('accepted'));
    assert.doesNotThrow(() => unavailable.api.revoke());
    const blocked = harness({ scriptThrows: true });
    assert.doesNotThrow(() => blocked.api.setConsent('accepted'));
    assert.equal(blocked.api.track('purchase', { transaction_id: 'mont6_1', value: 600, currency: 'EUR' }), false);
    const h = harness();
    h.api.setConsent('accepted');
    assert.equal(h.api.track('unknown', {}), false);
    assert.equal(h.api.track('contact_request', { method: 'whatsapp', placement: 'https://private.example/' }), false);
    assert.equal(h.api.track('purchase', null), false);
    h.addedScripts[0].onerror();
    assert.equal(h.api.track('page_view'), false);
    for (const options of [{ url: 'http://localhost:8788/' }, { url: 'https://preview.pages.dev/' }, { unconfigured: true }]) {
        const preview = harness(options);
        preview.api.setConsent('accepted');
        assert.equal(preview.addedScripts.length, 0);
    }
});
