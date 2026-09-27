/** Offline browser integration checks. No requests reach Stripe or analytics. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'booking-status.js'), 'utf8');
const verified = { status: 'confirmed', checkIn: '2030-09-10', checkOut: '2030-09-12',
    guests: 2, amount: 34025, currency: 'eur', transactionId: 'mont6_42' };

async function page({ data = verified, consent = 'accepted', ok = true, failure, analyticsMissing = false } = {}) {
    const ids = ['booking-status-title', 'booking-status-message', 'booking-status-details', 'booking-home', 'confirmed-icon'];
    const elements = Object.fromEntries(ids.map(id => [id, { textContent: '', hidden: true, href: '' }]));
    const events = [], listeners = new Map(), storageWrites = [], storageReads = [], storageRemovals = [];
    let choice = consent, calls = 0, trackAttempts = 0;
    const window = {
        addEventListener(name, fn) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(fn); },
        removeEventListener(name, fn) { listeners.get(name)?.delete(fn); },
    };
    if (!analyticsMissing) window.Mont6Analytics = {
        getConsent() { if (failure === 'consent') throw new Error('Consent unavailable'); return choice; },
        track(name, payload) {
            trackAttempts++;
            if (failure === 'track') throw new Error('Analytics blocked');
            if (failure === 'declined') return false;
            events.push({ name, payload: JSON.parse(JSON.stringify(payload)) });
            return true;
        },
    };
    const storage = {
        getItem(key) { storageReads.push(key); throw new Error('Storage must not be read for purchase tracking'); },
        setItem(key, value) { storageWrites.push([key, value]); throw new Error('Storage must not be written for purchase tracking'); },
        removeItem(key) { storageRemovals.push(key); },
    };
    await vm.runInNewContext(source, {
        window, document: { documentElement: { dataset: { lang: 'it' } }, getElementById: id => elements[id], title: '' },
        location: { search: '?session_id=cs_live_privateBearer12345678' },
        URLSearchParams, AbortSignal, Intl, sessionStorage: storage, localStorage: storage,
        setTimeout(fn) { fn(); },
        async fetch(url, options) {
            calls++;
            assert.match(url, /^\/api\/booking-status\?session_id=/);
            assert.equal(options.cache, 'no-store');
            return { ok, json: async () => data };
        },
    });
    return { elements, events, storageWrites, storageReads, storageRemovals,
        get calls() { return calls; }, get trackAttempts() { return trackAttempts; },
        listenerCount() { return listeners.get('mont6:analytics-consent')?.size || 0; },
        choose(next) {
            choice = next;
            for (const fn of [...(listeners.get('mont6:analytics-consent') || [])]) fn({ type: 'mont6:analytics-consent' });
        },
    };
}

test('verified purchase sends only the stable transaction and EUR totals after consent', async () => {
    const p = await page({ data: { ...verified, session_id: 'cs_live_privateBearer12345678',
        guest_name: 'Private Guest', guest_email: 'private@example.test' } });
    assert.deepEqual(p.events, [{ name: 'purchase', payload: {
        transaction_id: 'mont6_42', value: 340.25, currency: 'EUR',
        items: [{ item_id: 'mont6_stay', item_name: 'Soggiorno Mont6', quantity: 1, price: 340.25 }],
    } }]);
    assert.equal(p.calls, 1);
    assert.equal(p.elements['booking-status-title'].textContent, 'Prenotazione confermata');
    assert.equal(p.elements['booking-status-details'].hidden, false);
    assert.deepEqual(p.storageWrites, []);
    assert.deepEqual(p.storageReads, []);
});

test('a verified purchase waits in memory for acceptance and retries only once', async () => {
    const p = await page({ consent: null });
    assert.deepEqual(p.events, []);
    assert.equal(p.trackAttempts, 0);
    assert.equal(p.listenerCount(), 1);
    assert.deepEqual(p.storageWrites, []);
    assert.deepEqual(p.storageReads, []);
    p.choose(null);assert.equal(p.trackAttempts, 0);
    p.choose('accepted');p.choose('accepted');
    assert.equal(p.events.length, 1);
    assert.equal(p.trackAttempts, 1);
    assert.equal(p.listenerCount(), 0);
    assert.equal(p.events[0].payload.transaction_id, 'mont6_42');
});

test('rejection drops the pending purchase without persisting or sending it', async () => {
    for (const consent of [null, 'rejected']) {
        const p = await page({ consent });
        p.choose('rejected');p.choose('accepted');
        assert.equal(p.trackAttempts, 0);
        assert.equal(p.listenerCount(), 0);
        assert.deepEqual(p.storageWrites, []);
        assert.deepEqual(p.storageReads, []);
    }
});

test('pending, invalid, cancelled and unsuccessful responses never produce purchase events', async () => {
    for (const status of ['pending', 'invalid', 'cancelled', 'expired']) {
        const p = await page({ data: { ...verified, status } });
        assert.equal(p.trackAttempts, 0, status);
        assert.equal(p.listenerCount(), 0, status);
    }
    const p = await page({ ok: false });
    assert.equal(p.trackAttempts, 0);
    assert.equal(p.elements['booking-status-title'].textContent, 'Conferma ancora in verifica');
});

test('invalid identifiers, amounts and currencies cannot enter purchase analytics', async () => {
    for (const change of [
        { transactionId: undefined }, { transactionId: 'cs_live_privateBearer12345678' },
        { transactionId: 'mont6_0' }, { transactionId: 'mont6_-1' }, { transactionId: 'mont6_01' },
        { amount: 0 }, { amount: -100 }, { amount: '34025' }, { amount: 34025.5 },
        { currency: 'USD' },
    ]) {
        const p = await page({ data: { ...verified, ...change } });
        assert.equal(p.trackAttempts, 0, JSON.stringify(change));
        assert.equal(p.elements['booking-status-title'].textContent, 'Prenotazione confermata');
        assert.equal(p.elements['booking-status-details'].hidden, false);
    }
});

test('missing, declining or throwing analytics cannot interrupt a confirmed booking', async () => {
    for (const options of [{ analyticsMissing: true }, { failure: 'track' }, { failure: 'consent' }, { failure: 'declined' }]) {
        const p = await page(options);
        assert.equal(p.calls, 1, JSON.stringify(options));
        assert.equal(p.elements['booking-status-title'].textContent, 'Prenotazione confermata');
        assert.equal(p.elements['confirmed-icon'].hidden, false);
        assert.equal(p.elements['booking-status-details'].hidden, false);
        assert.deepEqual(p.storageRemovals, ['mont6_sel', 'mont6_checkout']);
    }
    const p = await page({ consent: null, failure: 'track' });
    assert.doesNotThrow(() => p.choose('accepted'));
    p.choose('accepted');
    assert.equal(p.trackAttempts, 1);
    assert.equal(p.elements['booking-status-details'].hidden, false);
});
