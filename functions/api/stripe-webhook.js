import { json, stripe, recordPaidSession, cancelSession, releaseExpiredSession, sessionDetails } from '../_lib/payment.js';

const enc = new TextEncoder();
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export async function verifyStripeSignature(payload, header, secret) {
    if (!header || !secret) return false;
    const parts = header.split(',').map(s => s.trim().split('='));
    const timestamp = parts.find(p => p[0] === 't')?.[1];
    const signatures = parts.filter(p => p[0] === 'v1' && /^[a-f0-9]{64}$/i.test(p[1])).map(p => p[1]);
    if (!/^\d+$/.test(timestamp || '') || !signatures.length
        || Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > 300) return false;
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    for (const signature of signatures) {
        const bytes = Uint8Array.from(signature.match(/../g), b => parseInt(b, 16));
        if (await crypto.subtle.verify('HMAC', key, bytes, enc.encode(`${timestamp}.${payload}`))) return true;
    }
    return false;
}

/** Separate durable receipts for guest and host; Resend deduplicates concurrent retries. */
async function deliver(env, key, { to, subject, html }) {
    if (await env.DB.prepare('SELECT delivery_key FROM email_deliveries WHERE delivery_key = ?').bind(key).first()) return;
    if (!env.RESEND_API_KEY || !env.BOOKING_FROM_EMAIL || !to) throw new Error('Email delivery not configured');
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json', 'Idempotency-Key': key },
        body: JSON.stringify({ from: `Mont°6 <${env.BOOKING_FROM_EMAIL}>`, to, subject, html }),
        signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`Email HTTP ${response.status}`);
    await env.DB.prepare('INSERT OR IGNORE INTO email_deliveries (delivery_key) VALUES (?)').bind(key).run();
}

function guestHtml(d) {
    const en = d.lang === 'en';
    return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#26231F">
        <h1>Mont°6 — ${en ? 'Booking confirmed' : 'Prenotazione confermata'}</h1>
        <p>${en ? 'Hello' : 'Ciao'} ${esc(d.name)}, ${en ? 'your stay is confirmed.' : 'il tuo soggiorno è confermato.'}</p>
        <p>Check-in: ${esc(d.checkIn)} · Check-out: ${esc(d.checkOut)}<br>
        ${en ? 'Guests' : 'Ospiti'}: ${d.guests}<br>${en ? 'Paid' : 'Totale pagato'}: €${d.total}</p>
        <p>${en ? 'Check-in from 3pm. Check-out by 10am. Arrival instructions will follow before your stay.'
            : 'Check-in dalle 15:00. Check-out entro le 10:00. Riceverai le istruzioni di arrivo prima del soggiorno.'}</p>
        <p>Mont°6 · Cefalù</p></div>`;
}

export async function onRequestPost({ request, env }) {
    if (!env.STRIPE_WEBHOOK_SECRET) return json(503, { error: 'Webhook not configured' });
    const payload = await request.text();
    if (payload.length > 1048576) return json(413, { error: 'Payload too large' });
    if (!await verifyStripeSignature(payload, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET)) return json(400, { error: 'Invalid signature' });
    let event;
    try { event = JSON.parse(payload); } catch { return json(400, { error: 'Invalid JSON' }); }
    const supported = ['checkout.session.completed', 'checkout.session.async_payment_succeeded',
        'checkout.session.expired', 'checkout.session.async_payment_failed', 'charge.refunded'];
    if (!supported.includes(event.type)) return json(200, { received: true });
    if (!env.DB) return json(503, { error: 'Booking database unavailable' });
    try {
        const s = event.data?.object;
        if (!s?.id) return json(400, { error: 'Invalid event' });
        if (event.type === 'checkout.session.expired') {
            await releaseExpiredSession(env, s);
        } else if (event.type === 'checkout.session.async_payment_failed') {
            // Delayed methods from older checkouts can fail after session completion.
            const current = await stripe(env, `checkout/sessions/${encodeURIComponent(s.id)}`);
            if (current.payment_status === 'paid') await recordPaidSession(env, current);
            else await env.DB.prepare("UPDATE checkout_holds SET status = 'released' WHERE status = 'active' AND stripe_session_id = ?").bind(s.id).run();
        } else if (event.type === 'charge.refunded') {
            if (!s.payment_intent) return json(200, { received: true });
            const intent = typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent.id;
            const sessions = await stripe(env, `checkout/sessions?payment_intent=${encodeURIComponent(intent)}&limit=1`);
            const session = sessions.data?.[0];
            if (!session?.metadata?.checkIn) return json(200, { received: true });
            const full = s.amount_refunded >= s.amount;
            if (full) await cancelSession(env, session);
            await deliver(env, `mont6-refund-${event.id}`, { to: env.BOOKING_HOST_EMAIL,
                subject: full ? 'Rimborso totale: prenotazione annullata' : 'Rimborso parziale: verifica la prenotazione',
                html: `<p>Sessione ${esc(session.id)}.</p><p>${full ? 'Le date della prenotazione diretta sono tornate disponibili.'
                    : 'Le date restano bloccate. Se il soggiorno è annullato, imposta la prenotazione come cancelled nel database. Rimuovere blocchi dal file JSON non libera una prenotazione D1.'}</p>` });
        } else if (s.payment_status === 'paid' && s.metadata?.checkIn) {
            const booking = await recordPaidSession(env, s);
            if (booking?.status === 'confirmed') {
                const d = sessionDetails(s);
                // A failure from either recipient causes a retry without resending the other.
                const results = await Promise.allSettled([
                    (async () => {
                        if (!booking.sent_confirmation_at) {
                            await deliver(env, `mont6-guest-${s.id}`, { to: d.email,
                                subject: d.lang === 'en' ? 'Your stay at Mont°6 is confirmed' : 'La tua prenotazione a Mont°6 è confermata', html: guestHtml(d) });
                            await env.DB.prepare("UPDATE bookings SET sent_confirmation_at = datetime('now') WHERE stripe_session_id = ?").bind(s.id).run();
                        }
                    })(),
                    deliver(env, `mont6-host-${s.id}`, { to: env.BOOKING_HOST_EMAIL,
                        subject: `Nuova prenotazione: ${d.checkIn} → ${d.checkOut}`,
                        html: `<p>${esc(d.name)} (${esc(d.email)})</p><p>${d.checkIn} → ${d.checkOut}, ${d.guests} ospiti. Totale €${d.total}.</p><p>Le date sono bloccate nel calendario del sito.</p>` }),
                ]);
                const failed = results.find(r => r.status === 'rejected');
                if (failed) throw failed.reason;
            }
        }
        return json(200, { received: true });
    } catch (error) {
        console.error('Stripe event needs retry:', event.id, error.message);
        // Booking failures are visible to the host as well as in Stripe's retry queue.
        if (event.type.startsWith('checkout.session.') && event.data?.object?.payment_status === 'paid') {
            try {
                await deliver(env, `mont6-attention-${event.id}`, { to: env.BOOKING_HOST_EMAIL,
                    subject: 'Mont°6: pagamento da verificare',
                    html: `<p>Verifica il pagamento ${esc(event.data.object.id)} e la sua registrazione in D1.</p><p>${esc(error.message)}</p><p>Non confermare altre prenotazioni per queste date finché il problema non è risolto. Stripe ritenterà la notifica.</p>` });
            } catch { /* Stripe's failed delivery remains the recovery signal if email is down. */ }
        }
        return json(503, { error: 'Event processing incomplete; retry required' });
    }
}
