const { test } = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const middleware = import(pathToFileURL(path.join(__dirname, '../functions/_middleware.js')).href);

test('API responses keep their body and no-store policy while receiving security headers', async () => {
    const { onRequest } = await middleware;
    const res = await onRequest({
        request: new Request('https://mont6cefalu.it/api/booking-status'), env: {},
        next: async () => Response.json({ status: 'invalid' }, { status: 400, headers: { 'Cache-Control': 'no-store' } }),
    });
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { status: 'invalid' });
    assert.equal(res.headers.get('Cache-Control'), 'no-store');
    assert.equal(res.headers.get('Referrer-Policy'), 'no-referrer');
    assert.match(res.headers.get('Strict-Transport-Security'), /max-age=31536000/);
    assert.equal(res.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.match(res.headers.get('X-Robots-Tag'), /noindex/);
});

test('production checkout cannot bypass the protected domain through a Pages alias', async () => {
    const { onRequest } = await middleware;
    let reached = 0;
    const env = { BOOKING_ORIGIN: 'https://mont6cefalu.it' };
    const next = async () => { reached++; return Response.json({ ok: true }); };
    const alias = await onRequest({ request: new Request('https://mont6-website.pages.dev/api/create-checkout-session', { method: 'POST' }), env, next });
    assert.equal(alias.status, 403);
    assert.equal(reached, 0);
    const main = await onRequest({ request: new Request('https://mont6cefalu.it/api/create-checkout-session', { method: 'POST' }), env, next });
    assert.equal(main.status, 200);
    assert.equal(reached, 1);
    // Never block Stripe events on existing endpoint aliases.
    const hook = await onRequest({ request: new Request('https://mont6-website.pages.dev/api/stripe-webhook', { method: 'POST' }), env, next });
    assert.equal(hook.status, 200);
});

test('language redirects carry security headers and a secure preference cookie', async () => {
    const { onRequest } = await middleware;
    const res = await onRequest({ request: new Request('https://mont6cefalu.it/?lang=en'), env: {}, next: async () => { throw new Error('must not run'); } });
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('Location'), 'https://mont6cefalu.it/en/');
    assert.match(res.headers.get('Set-Cookie'), /; Secure/);
    assert.match(res.headers.get('Strict-Transport-Security'), /max-age/);
});

test('cached source paths are rejected before asset lookup while public licenses stay available', async () => {
    const { onRequest } = await middleware;
    let assetReads = 0;
    const next = async () => { assetReads++; return new Response('public'); };
    for (const path of ['/schema.sql', '/BACKEND-SETUP.md', '/worker-emails/worker.js', '/%73chema.sql',
        '/scripts/build-en.js', '/.env', '/.git/config', '/package-lock.json', '/migrations/0002_booking_terms.sql']) {
        const res = await onRequest({ request: new Request(`https://mont6cefalu.it${path}`), env: {}, next });
        assert.equal(res.status, 404, path);
        assert.equal(res.headers.get('Cache-Control'), 'no-store');
    }
    assert.equal(assetReads, 0);
    for (const path of ['/vendor/leaflet/LICENSE', '/vendor/glightbox/LICENSE.md', '/prezzi.json', '/img/opt/photo.webp']) {
        const res = await onRequest({ request: new Request(`https://mont6cefalu.it${path}`), env: {}, next });
        assert.equal(res.status, 200, path);
    }
    assert.equal(assetReads, 4);
});
