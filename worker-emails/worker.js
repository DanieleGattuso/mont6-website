import { todayInRome, parseDate, isoDate } from '../functions/_lib/payment.js';

export default {
    async scheduled(event, env, ctx) { ctx.waitUntil(runDailyEmails(env)); },
    async fetch(request, env) {
        // A URL query leaks the secret into browser history and access logs.
        if (request.method !== 'POST' || !env.CRON_TEST_KEY) return new Response('Mont°6 email worker', { status: 200 });
        const supplied = request.headers.get('Authorization') || '';
        const encoder = new TextEncoder();
        const hashes = await Promise.all([supplied, `Bearer ${env.CRON_TEST_KEY}`].map(value => crypto.subtle.digest('SHA-256', encoder.encode(value))));
        let difference = 0;
        const a = new Uint8Array(hashes[0]), b = new Uint8Array(hashes[1]);
        for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
        if (difference) return new Response('Unauthorized', { status: 401 });
        return Response.json(await runDailyEmails(env), { headers: { 'Cache-Control': 'no-store' } });
    },
};

const esc = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export async function runDailyEmails(env) {
    if (!env.DB || !env.RESEND_API_KEY || !env.BOOKING_FROM_EMAIL) throw new Error('Email worker configuration incomplete');
    const today = todayInRome(), twoDays = parseDate(today);
    twoDays.setUTCDate(twoDays.getUTCDate() + 2);
    // Catch up after a failed cron, and handle bookings made less than 2 days before arrival.
    const pre = await env.DB.prepare(`SELECT b.*, h.lang FROM bookings b LEFT JOIN checkout_holds h ON h.stripe_session_id = b.stripe_session_id
        WHERE b.status = 'confirmed' AND b.sent_prearrival_at IS NULL AND b.check_in BETWEEN ? AND ?`).bind(today, isoDate(twoDays)).all();
    const rev = await env.DB.prepare(`SELECT b.*, h.lang FROM bookings b LEFT JOIN checkout_holds h ON h.stripe_session_id = b.stripe_session_id
        WHERE b.status = 'confirmed' AND b.sent_review_at IS NULL AND b.check_out <= ?`).bind(today).all();
    let prearrival = 0, reviews = 0, failed = 0;
    for (const [kind, rows] of [['prearrival', pre.results], ['review', rev.results]]) {
        for (const booking of rows || []) {
            try {
                const key = `mont6-${kind}-${booking.stripe_session_id || booking.id}`;
                const delivered = await env.DB.prepare('SELECT delivery_key FROM email_deliveries WHERE delivery_key = ?').bind(key).first();
                if (!delivered) {
                    const content = emailContent(kind, booking, env);
                    const response = await fetch('https://api.resend.com/emails', {
                        method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': key },
                        body: JSON.stringify({ from: `Mont°6 <${env.BOOKING_FROM_EMAIL}>`, to: booking.guest_email, ...content }),
                        signal: AbortSignal.timeout(8000),
                    });
                    if (!response.ok) throw new Error(`Email HTTP ${response.status}`);
                    await env.DB.prepare('INSERT OR IGNORE INTO email_deliveries (delivery_key) VALUES (?)').bind(key).run();
                }
                // Column name comes exclusively from the two local kinds above.
                const column = kind === 'prearrival' ? 'sent_prearrival_at' : 'sent_review_at';
                await env.DB.prepare(`UPDATE bookings SET ${column} = datetime('now') WHERE id = ?`).bind(booking.id).run();
                if (kind === 'prearrival') prearrival++; else reviews++;
            } catch (error) { failed++; console.error('Daily email failed:', booking.id, kind, error.message); }
        }
    }
    if (failed) throw new Error(`${failed} guest emails failed; next cron will retry`);
    return { prearrival, reviews };
}

export function emailContent(kind, b, env) {
    const en = b.lang === 'en', t = (it, english) => en ? english : it;
    const title = kind === 'prearrival' ? t('Il tuo arrivo a Mont°6', 'Your arrival at Mont°6') : t('Com’è andato il tuo soggiorno a Mont°6?', 'How was your stay at Mont°6?');
    let body;
    if (kind === 'prearrival') {
        body = `<p>${t('Check-in', 'Check-in')}: ${esc(b.check_in)}. ${t('Dalle 15:00; check-out entro le 10:00.', 'From 3pm; check-out by 10am.')}</p>
            <p>${t('Self check-in con serratura digitale: ti invieremo il codice il giorno dell’arrivo. Parcheggio consigliato: Parcheggio Coco, sul lungomare (circa 5 minuti a piedi). Wi-Fi incluso.',
                'Self check-in with a digital lock: we will send your code on arrival day. Recommended parking: Parcheggio Coco, on the seafront (about a 5-minute walk). Wi-Fi included.')}</p>`;
    } else {
        let url = '';
        try { if (env.REVIEW_URL && new URL(env.REVIEW_URL).protocol === 'https:') url = env.REVIEW_URL; } catch { /* omit invalid review link */ }
        body = `<p>${t('Grazie per aver soggiornato da noi. Se ti va, racconta la tua esperienza con una recensione.', 'Thank you for staying with us. If you would like, share your experience in a review.')}</p>
            ${url ? `<p><a href="${esc(url)}">${t('Lascia una recensione', 'Leave a review')}</a></p>` : ''}`;
    }
    return { subject: title, html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#26231F"><h1>${title}</h1><p>${t('Ciao', 'Hello')} ${esc(b.guest_name)},</p>${body}<p>${t('Per qualsiasi domanda rispondi a questa email o scrivimi su WhatsApp.', 'For any questions, reply to this email or message me on WhatsApp.')} +39 388 190 8816</p><p>Mont°6 · Cefalù</p></div>` };
}
