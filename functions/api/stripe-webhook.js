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

/** Escape dei caratteri HTML per prevenire injection nelle email (nome/email da Stripe). */
function esc(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

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

/** Ritorna true solo se l'email e' stata davvero accettata da Resend. */
async function sendEmail(env, { to, subject, html }) {
    if (!env.RESEND_API_KEY || !env.BOOKING_FROM_EMAIL || !to) return false;
    try {
        const r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ from: `Mont°6 <${env.BOOKING_FROM_EMAIL}>`, to, subject, html }),
        });
        if (!r.ok) {
            console.error('Resend error:', r.status, await r.text());
            return false;
        }
        return true;
    } catch (e) {
        console.error('Resend fetch failed:', e);
        return false;
    }
}

function guestEmailHtml({ name, checkIn, checkOut, guests, total }) {
    return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;color:#26231F">
      <h1 style="font-family:Georgia,serif;color:#A8854C">Mont°6 — Prenotazione confermata</h1>
      <p>Ciao ${esc(name)}, grazie! La tua prenotazione è confermata.</p>
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

/**
 * Allarme all'host quando il pagamento e' incassato ma la prenotazione NON e'
 * finita nel database. Corpo dedicato: quello di conferma diceva "le date sono
 * state bloccate automaticamente", cioe' l'esatto contrario di quel che accade.
 */
function allarmeEmailHtml({ name, email, checkIn, checkOut, guests, total, motivo }) {
    return `
    <div style="font-family:Inter,Arial,sans-serif">
      <h2 style="color:#8C3B2E">Pagamento incassato ma NON registrato</h2>
      <p>Stripe ha incassato, ma la prenotazione non e' stata scritta nel database:
         <strong>le date NON sono bloccate</strong> e restano vendibili.</p>
      <ul>
        <li><strong>Ospite:</strong> ${esc(name) || '—'} (${esc(email) || '—'})</li>
        <li><strong>Check-in:</strong> ${checkIn}</li>
        <li><strong>Check-out:</strong> ${checkOut}</li>
        <li><strong>Ospiti:</strong> ${guests}</li>
        <li><strong>Totale incassato:</strong> €${total}</li>
        <li><strong>Motivo:</strong> ${esc(motivo)}</li>
      </ul>
      <p><strong>Cosa fare adesso:</strong> blocca a mano quelle date in
         blocked-dates.json e scrivi all'ospite per confermargli il soggiorno.</p>
      <p style="color:#6E675C;font-size:13px">Questo messaggio si ripete a ogni
         nuovo tentativo di Stripe finche' il problema non e' risolto.</p>
    </div>`;
}

function hostEmailHtml({ name, email, checkIn, checkOut, guests, total }) {
    return `
    <div style="font-family:Inter,Arial,sans-serif">
      <h2>Nuova prenotazione diretta 🎉</h2>
      <ul>
        <li><strong>Ospite:</strong> ${esc(name) || '—'} (${esc(email) || '—'})</li>
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

    // Rimborso: le condizioni pubblicate sul sito prevedono cancellazioni, quindi
    // le date devono tornare libere. Stripe manda payment_intent, non l'id della
    // sessione: lo ritroviamo interrogando l'API, cosi' non serve toccare il database.
    if (event.type === 'charge.refunded') {
        const charge = event.data.object;
        const intent = charge.payment_intent;
        const rimborsoTotale = charge.amount_refunded >= charge.amount;

        // Fallire aperto qui significa lasciare bloccate per sempre date gia'
        // rimborsate: si risponde 500 cosi' Stripe ritenta e l'host viene avvisato.
        if (!env.DB || !env.STRIPE_SECRET_KEY) {
            console.error('Rimborso non elaborabile: manca DB o chiave Stripe');
            await sendEmail(env, {
                to: env.BOOKING_HOST_EMAIL,
                subject: 'Rimborso da liberare a mano sul calendario',
                html: `<p>Rimborso ricevuto ma non elaborabile (manca il database o la chiave Stripe). Libera a mano le date della prenotazione rimborsata.</p>`,
            });
            return new Response('Rimborso non elaborabile', { status: 500 });
        }

        try {
            const r = await fetch(
                `https://api.stripe.com/v1/checkout/sessions?payment_intent=${intent}&limit=1`,
                { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } }
            );
            if (!r.ok) {
                console.error('API Stripe non raggiungibile nel rimborso. Status:', r.status);
                await sendEmail(env, {
                    to: env.BOOKING_HOST_EMAIL,
                    subject: 'Rimborso da liberare a mano sul calendario',
                    html: `<p>Rimborso ricevuto ma non sono riuscito a risalire alla prenotazione (Stripe ha risposto ${r.status}). Libera a mano le date.</p>`,
                });
                return new Response('Stripe API ' + r.status, { status: 500 });
            }
            const data = await r.json();
            const sessionId = data && data.data && data.data[0] && data.data[0].id;
            if (!sessionId) {
                console.error('Nessuna sessione trovata per payment_intent', intent);
                await sendEmail(env, {
                    to: env.BOOKING_HOST_EMAIL,
                    subject: 'Rimborso senza prenotazione collegata',
                    html: `<p>E' arrivato un rimborso che non risulta collegato a nessuna prenotazione del sito. Se riguarda un soggiorno, libera a mano le date.</p>`,
                });
                return new Response(JSON.stringify({ received: true, noSession: true }), {
                    status: 200, headers: { 'Content-Type': 'application/json' },
                });
            }
            if (rimborsoTotale) {
                await env.DB.prepare(
                    `UPDATE bookings SET status = 'cancelled' WHERE stripe_session_id = ?`
                ).bind(sessionId).run();
                await sendEmail(env, {
                    to: env.BOOKING_HOST_EMAIL,
                    subject: 'Prenotazione rimborsata: date tornate disponibili',
                    html: `<p>Rimborso totale registrato. La prenotazione ${esc(sessionId)} e' stata annullata e le sue date sono di nuovo prenotabili.</p>`,
                });
            } else {
                // Rimborso parziale (la penale del 50%): il soggiorno resta valido,
                // le date restano bloccate. Avvisiamo l'host, decide lui.
                await sendEmail(env, {
                    to: env.BOOKING_HOST_EMAIL,
                    subject: 'Rimborso PARZIALE registrato: le date restano bloccate',
                    html: `<p>Rimborso parziale sulla prenotazione ${esc(sessionId)}. Le date NON sono state liberate: se la cancellazione e' definitiva, rimborsa il resto oppure liberale a mano in blocked-dates.json.</p>`,
                });
            }
        } catch (e) {
            console.error('Errore gestione rimborso:', e);
            return new Response('Errore gestione rimborso', { status: 500 });
        }
    }

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

            // 2a. Salva nel database PRIMA di confermare qualsiasi cosa.
            // Se questa scrittura non riesce, la prenotazione non blocca le date:
            // rispondiamo 500 cosi' Stripe ritenta (per 3 giorni) e avvisa. Confermare
            // all'ospite un soggiorno che il sistema non ha registrato e' peggio.
            if (!env.DB) {
                console.error('D1 non collegato: prenotazione pagata NON registrata', s.id);
                await sendEmail(env, {
                    to: env.BOOKING_HOST_EMAIL,
                    subject: `ATTENZIONE: pagamento ricevuto ma NON registrato (${checkInISO} → ${checkOutISO})`,
                    html: allarmeEmailHtml({ name, email, checkIn: checkInISO, checkOut: checkOutISO, guests, total, motivo: 'database non collegato' }),
                });
                return new Response('DB non disponibile', { status: 500 });
            }

            try {
                await env.DB.prepare(
                    `INSERT OR IGNORE INTO bookings
                     (stripe_session_id, check_in, check_out, guests, amount_total, currency, guest_email, guest_name)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
                ).bind(
                    s.id, checkInISO, checkOutISO, parseInt(guests, 10) || null,
                    s.amount_total || 0, s.currency || 'eur', email, name
                ).run();

                // Le email si saltano solo se sono DAVVERO gia' partite, non perche'
                // la riga esisteva: Stripe ritenta proprio nei casi in cui l'invio
                // non era stato raggiunto, e il rinvio manuale dal cruscotto Stripe
                // deve poter recuperare una conferma mai arrivata all'ospite.
                const riga = await env.DB.prepare(
                    `SELECT sent_confirmation_at FROM bookings WHERE stripe_session_id = ?`
                ).bind(s.id).first();

                if (riga && riga.sent_confirmation_at) {
                    return new Response(JSON.stringify({ received: true, giaConfermata: true }), {
                        status: 200, headers: { 'Content-Type': 'application/json' },
                    });
                }
            } catch (e) {
                console.error('Errore inserimento D1:', e);
                await sendEmail(env, {
                    to: env.BOOKING_HOST_EMAIL,
                    subject: `ATTENZIONE: pagamento ricevuto ma NON registrato (${checkInISO} → ${checkOutISO})`,
                    html: allarmeEmailHtml({ name, email, checkIn: checkInISO, checkOut: checkOutISO, guests, total, motivo: String(e && e.message || e) }),
                });
                return new Response('Errore scrittura prenotazione', { status: 500 });
            }

            // 2b. Email ospite + notifica host
            const inviata = await sendEmail(env, {
                to: email,
                subject: 'La tua prenotazione a Mont°6 è confermata',
                html: guestEmailHtml({ name, checkIn: checkInISO, checkOut: checkOutISO, guests, total }),
            });
            await sendEmail(env, {
                to: env.BOOKING_HOST_EMAIL,
                subject: `Nuova prenotazione: ${checkInISO} → ${checkOutISO}`,
                html: hostEmailHtml({ name, email, checkIn: checkInISO, checkOut: checkOutISO, guests, total }),
            });

            // Si segna solo se la conferma all'ospite e' partita davvero: cosi' un
            // rinvio dal cruscotto Stripe puo' ancora recuperarla.
            if (inviata) {
                try {
                    await env.DB.prepare(
                        `UPDATE bookings SET sent_confirmation_at = datetime('now') WHERE stripe_session_id = ?`
                    ).bind(s.id).run();
                } catch (e) {
                    console.error('Non sono riuscito a segnare la conferma inviata:', e);
                }
            } else {
                console.error('Conferma NON inviata all ospite per la sessione', s.id);
            }
        }
    }

    return new Response(JSON.stringify({ received: true }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
    });
}
