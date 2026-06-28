/**
 * Cloudflare Pages Function — POST /api/stripe-webhook
 *
 * Riceve gli eventi di Stripe. Su pagamento completato:
 *   1. salva la prenotazione nel database D1 (binding `DB`)  → storico + blocco date
 *   2. invia email di conferma all'ospite e notifica all'host (Resend)
 *
 * Variabili d'ambiente richieste (Cloudflare → Settings → Variables and Secrets):
 *   STRIPE_SECRET_KEY       (già presente)
 *   STRIPE_WEBHOOK_SECRET   (whsec_...  — dal Dashboard Stripe → Developers → Webhooks)
 *   RESEND_API_KEY          (re_...     — da resend.com)
 *   BOOKING_FROM_EMAIL      (es. prenotazioni@mont6cefalu.it  oppure onboarding@resend.dev)
 *   BOOKING_HOST_EMAIL      (dove ricevere le notifiche, es. mont6.home@gmail.com)
 * Binding D1 richiesto:  DB  → database "mont6-bookings"
 */

const enc = new TextEncoder();

/** Verifica la firma Stripe-Signature con Web Crypto (nessuna dipendenza npm). */
async function verifyStripeSignature(payload, sigHeader, secret, toleranceSec = 300) {
    if (!sigHeader) return false;
    const parts = Object.fromEntries(sigHeader.split(',').map((kv) => kv.split('=')));
    const t = parts.t;
    const v1 = parts.v1;
    if (!t || !v1) return false;

    // Rifiuta eventi troppo vecchi (replay protection)
    if (Math.abs(Math.floor(Date.now() / 1000) - Number(t)) > toleranceSec) return false;

    const key = await crypto.subtle.importKey(
        'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const mac = await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${payload}`));
    const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');

    // Confronto a tempo costante
    if (expected.length !== v1.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ v1.charCodeAt(i);
    return diff === 0;
}

/** "dd/mm/yyyy" -> "yyyy-mm-dd" */
function toISO(ddmmyyyy) {
    if (!ddmmyyyy || !ddmmyyyy.includes('/')) return ddmmyyyy;
    const [d, m, y] = ddmmyyyy.trim().split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

async function sendEmail(env, { to, subject, html }) {
    if (!env.RESEND_API_KEY || !env.BOOKING_FROM_EMAIL || !to) return;
    try {
        const r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ from: `Mont°6 <${env.BOOKING_FROM_EMAIL}>`, to, subject, html }),
        });
        if (!r.ok) console.error('Resend error:', r.status, await r.text());
    } catch (e) {
        console.error('Resend fetch failed:', e);
    }
}

function guestEmailHtml({ name, checkIn, checkOut, guests, total }) {
    return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;color:#26231F">
      <h1 style="font-family:Georgia,serif;color:#A8854C">Mont°6 — Prenotazione confermata</h1>
      <p>Ciao ${name || ''}, grazie! La tua prenotazione è confermata.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px 0;border-bottom:1px solid #eee">Check-in</td><td style="text-align:right">${checkIn}</td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #eee">Check-out</td><td style="text-align:right">${checkOut}</td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #eee">Ospiti</td><td style="text-align:right">${guests}</td></tr>
        <tr><td style="padding:8px 0">Totale pagato</td><td style="text-align:right"><strong>€${total}</strong></td></tr>
      </table>
      <p>Check-in dalle 15:00 · Check-out entro le 10:00. Ti invieremo le istruzioni di arrivo prima del soggiorno.</p>
      <p style="color:#6E675C;font-size:13px">Mont°6 Luxury Retreat · Cefalù, Sicilia</p>
    </div>`;
}

function hostEmailHtml({ name, email, checkIn, checkOut, guests, total }) {
    return `
    <div style="font-family:Inter,Arial,sans-serif">
      <h2>Nuova prenotazione diretta 🎉</h2>
      <ul>
        <li><strong>Ospite:</strong> ${name || '—'} (${email || '—'})</li>
        <li><strong>Check-in:</strong> ${checkIn}</li>
        <li><strong>Check-out:</strong> ${checkOut}</li>
        <li><strong>Ospiti:</strong> ${guests}</li>
        <li><strong>Totale:</strong> €${total}</li>
      </ul>
      <p>Le date sono state bloccate automaticamente sul calendario del sito.</p>
    </div>`;
}

export async function onRequestPost({ request, env }) {
    const payload = await request.text(); // RAW body, necessario per la firma

    // 1. Verifica firma
    const ok = await verifyStripeSignature(
        payload, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET
    );
    if (!ok) return new Response('Invalid signature', { status: 400 });

    let event;
    try { event = JSON.parse(payload); } catch { return new Response('Bad JSON', { status: 400 }); }

    // 2. Gestiamo solo il pagamento completato
    if (event.type === 'checkout.session.completed') {
        const s = event.data.object;
        if (s.payment_status === 'paid') {
            const md = s.metadata || {};
            const checkInISO = toISO(md.checkIn);
            const checkOutISO = toISO(md.checkOut);
            const guests = md.guests || '';
            const total = ((s.amount_total || 0) / 100).toFixed(2);
            const email = s.customer_details?.email || '';
            const name = s.customer_details?.name || '';

            // 2a. Salva nel database (idempotente grazie a UNIQUE su stripe_session_id)
            if (env.DB) {
                try {
                    await env.DB.prepare(
                        `INSERT OR IGNORE INTO bookings
                         (stripe_session_id, check_in, check_out, guests, amount_total, currency, guest_email, guest_name)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
                    ).bind(
                        s.id, checkInISO, checkOutISO, parseInt(guests, 10) || null,
                        s.amount_total || 0, s.currency || 'eur', email, name
                    ).run();
                } catch (e) {
                    console.error('Errore inserimento D1:', e);
                }
            }

            // 2b. Email ospite + notifica host
            await sendEmail(env, {
                to: email,
                subject: 'La tua prenotazione a Mont°6 è confermata',
                html: guestEmailHtml({ name, checkIn: checkInISO, checkOut: checkOutISO, guests, total }),
            });
            await sendEmail(env, {
                to: env.BOOKING_HOST_EMAIL,
                subject: `Nuova prenotazione: ${checkInISO} → ${checkOutISO}`,
                html: hostEmailHtml({ name, email, checkIn: checkInISO, checkOut: checkOutISO, guests, total }),
            });
        }
    }

    return new Response(JSON.stringify({ received: true }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
    });
}
