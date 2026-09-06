/** Booking invariants shared by Checkout, webhooks and the return page. */
export const DAY = 86400000;
export const MONTHS = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

export function parseDate(value) {
    if (typeof value !== 'string') return null;
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    const local = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
    if (!iso && !local) return null;
    const [y, m, d] = iso ? iso.slice(1).map(Number) : [Number(local[3]), Number(local[2]), Number(local[1])];
    const date = new Date(Date.UTC(y, m - 1, d));
    if (y < 2000 || y > 2100 || date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
    return date;
}
export const isoDate = date => date.toISOString().slice(0, 10);
export function todayInRome() {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const get = type => parts.find(p => p.type === type).value;
    return `${get('year')}-${get('month')}-${get('day')}`;
}
export function json(status, data) {
    return Response.json(data, { status, headers: {
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
    } });
}
export async function readAsset(request, env, path) {
    const assetRequest = new Request(new URL(path, request.url));
    return env.ASSETS ? env.ASSETS.fetch(assetRequest) : fetch(assetRequest, { signal: AbortSignal.timeout(8000) });
}
export async function stripe(env, path, { body, key } = {}) {
    if (!env.STRIPE_SECRET_KEY) throw new Error('Stripe not configured');
    const response = await fetch(`https://api.stripe.com/v1/${path}`, {
        method: body ? 'POST' : 'GET', headers: {
            Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
            ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
            ...(key ? { 'Idempotency-Key': key } : {}),
        }, body, signal: AbortSignal.timeout(12000),
    });
    const data = await response.json();
    if (!response.ok) {
        const error = new Error(`Stripe HTTP ${response.status}`);
        error.status = response.status;
        throw error;
    }
    return data;
}
export function sessionDetails(s) {
    const md = s.metadata || {};
    const start = parseDate(md.checkIn), end = parseDate(md.checkOut);
    const guests = Number(md.guests);
    if (!start || !end || end <= start || ![1, 2].includes(guests)
        || !Number.isSafeInteger(s.amount_total) || s.amount_total <= 0 || s.currency !== 'eur') {
        throw new Error('Invalid booking metadata or amount');
    }
    return { checkIn: isoDate(start), checkOut: isoDate(end), guests, total: (s.amount_total / 100).toFixed(2),
        email: s.customer_details?.email || '', name: s.customer_details?.name || '', lang: md.lang === 'en' ? 'en' : 'it' };
}
/** Atomic INSERT ... SELECT: only one overlapping booking can be confirmed. */
export async function recordPaidSession(env, s) {
    if (!env.DB) throw new Error('DB not configured');
    if (s.mode !== 'payment' || s.payment_status !== 'paid') return null;
    const d = sessionDetails(s), holdId = s.metadata?.holdId || '';
    if (holdId) {
        const hold = await env.DB.prepare('SELECT * FROM checkout_holds WHERE id = ?').bind(holdId).first();
        if (!hold || (hold.stripe_session_id && hold.stripe_session_id !== s.id)
            || hold.check_in !== d.checkIn || hold.check_out !== d.checkOut
            || hold.guests !== d.guests || hold.amount_total !== s.amount_total) {
            throw new Error('Payment does not match the reserved stay');
        }
    }
    await env.DB.batch([
        env.DB.prepare(`INSERT INTO bookings
            (stripe_session_id, check_in, check_out, guests, amount_total, currency, guest_email, guest_name)
            SELECT ?, ?, ?, ?, ?, 'eur', ?, ?
            WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE status = 'confirmed' AND check_in < ? AND check_out > ?)
              AND NOT EXISTS (SELECT 1 FROM checkout_holds WHERE status = 'active' AND id != ? AND check_in < ? AND check_out > ?)
              AND NOT EXISTS (SELECT 1 FROM booking_cancellations WHERE stripe_session_id = ?)
            ON CONFLICT(stripe_session_id) DO NOTHING`).bind(s.id, d.checkIn, d.checkOut, d.guests,
                s.amount_total, d.email, d.name, d.checkOut, d.checkIn, holdId, d.checkOut, d.checkIn, s.id),
        env.DB.prepare(`UPDATE checkout_holds SET status = 'converted', stripe_session_id = ?
            WHERE id = ? AND EXISTS (SELECT 1 FROM bookings WHERE stripe_session_id = ? AND status = 'confirmed')`)
            .bind(s.id, holdId, s.id),
    ]);
    const row = await env.DB.prepare('SELECT * FROM bookings WHERE stripe_session_id = ?').bind(s.id).first();
    if (row) return row;
    const cancelled = await env.DB.prepare('SELECT stripe_session_id FROM booking_cancellations WHERE stripe_session_id = ?').bind(s.id).first();
    if (cancelled) return { status: 'cancelled' };
    throw new Error('Paid booking conflicts with an existing reservation: manual resolution required');
}
/** A refund can arrive before the completion webhook. Keep a tombstone. */
export async function cancelSession(env, s) {
    await env.DB.batch([
        env.DB.prepare('INSERT OR IGNORE INTO booking_cancellations (stripe_session_id) VALUES (?)').bind(s.id),
        env.DB.prepare("UPDATE bookings SET status = 'cancelled' WHERE stripe_session_id = ?").bind(s.id),
        env.DB.prepare("UPDATE checkout_holds SET status = 'released' WHERE stripe_session_id = ? OR id = ?")
            .bind(s.id, s.metadata?.holdId || ''),
    ]);
}
export async function releaseExpiredSession(env, s) {
    if (s.status !== 'expired' || s.payment_status === 'paid') return;
    await env.DB.prepare(`UPDATE checkout_holds SET status = 'released'
        WHERE status = 'active' AND (stripe_session_id = ? OR id = ?)`)
        .bind(s.id, s.metadata?.holdId || '').run();
}
/** Never free a hold based on our clock alone: Stripe may have just collected payment. */
export async function reconcileHolds(env, checkIn, checkOut) {
    const { results } = await env.DB.prepare(`SELECT stripe_session_id FROM checkout_holds
        WHERE status = 'active' AND expires_at <= ? AND stripe_session_id IS NOT NULL
        AND check_in < ? AND check_out > ? LIMIT 20`)
        .bind(Math.floor(Date.now() / 1000), checkOut, checkIn).all();
    for (const row of results || []) {
        const s = await stripe(env, `checkout/sessions/${encodeURIComponent(row.stripe_session_id)}`);
        if (s.payment_status === 'paid') await recordPaidSession(env, s);
        else await releaseExpiredSession(env, s);
    }
}
