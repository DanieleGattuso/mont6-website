/**
 * Mont°6 — Worker email automatiche (Cron)
 *
 * Gira ogni giorno (Cron Trigger) e, leggendo il database D1 delle prenotazioni:
 *   • invia l'email PRE-ARRIVO ~2 giorni prima del check-in
 *   • invia la richiesta di RECENSIONE il giorno del check-out (o dopo)
 * Ogni email viene inviata una sola volta (colonne sent_prearrival_at / sent_review_at).
 *
 * Binding richiesto:  DB  (database D1 "mont6-bookings")
 * Variabili richieste: RESEND_API_KEY, BOOKING_FROM_EMAIL
 * Variabili opzionali: REVIEW_URL (link recensione), CRON_TEST_KEY (per test manuale)
 */

export default {
    // Esecuzione programmata (Cron)
    async scheduled(event, env, ctx) {
        ctx.waitUntil(runDailyEmails(env));
    },

    // Endpoint per test manuale: https://<worker>.workers.dev/?key=LA_TUA_CHIAVE
    async fetch(request, env) {
        const url = new URL(request.url);
        if (env.CRON_TEST_KEY && url.searchParams.get('key') === env.CRON_TEST_KEY) {
            const result = await runDailyEmails(env);
            return Response.json(result);
        }
        return new Response('Mont°6 email cron worker attivo.', { status: 200 });
    },
};

function isoDate(d) {
    return d.toISOString().slice(0, 10);
}

async function runDailyEmails(env) {
    if (!env.DB) return { error: 'DB binding mancante' };

    const now = new Date();
    const todayISO = isoDate(now);
    const inTwoDaysISO = isoDate(new Date(now.getTime() + 2 * 86400000));
    let prearrival = 0, reviews = 0;

    // 1) PRE-ARRIVO: check-in tra 2 giorni e non ancora inviata
    const pre = await env.DB.prepare(
        `SELECT * FROM bookings
         WHERE status = 'confirmed' AND sent_prearrival_at IS NULL AND check_in = ?`
    ).bind(inTwoDaysISO).all();

    for (const b of pre.results || []) {
        const ok = await sendEmail(env, {
            to: b.guest_email,
            subject: 'Il tuo arrivo a Mont°6 — istruzioni utili',
            html: prearrivalHtml(b),
        });
        if (ok) {
            await env.DB.prepare(`UPDATE bookings SET sent_prearrival_at = datetime('now') WHERE id = ?`).bind(b.id).run();
            prearrival++;
        }
    }

    // 2) RECENSIONE: check-out oggi o passato e non ancora inviata
    const rev = await env.DB.prepare(
        `SELECT * FROM bookings
         WHERE status = 'confirmed' AND sent_review_at IS NULL AND check_out <= ?`
    ).bind(todayISO).all();

    for (const b of rev.results || []) {
        const ok = await sendEmail(env, {
            to: b.guest_email,
            subject: 'Com’è andato il tuo soggiorno a Mont°6?',
            html: reviewHtml(b, env),
        });
        if (ok) {
            await env.DB.prepare(`UPDATE bookings SET sent_review_at = datetime('now') WHERE id = ?`).bind(b.id).run();
            reviews++;
        }
    }

    return { prearrival, reviews };
}

async function sendEmail(env, { to, subject, html }) {
    if (!env.RESEND_API_KEY || !env.BOOKING_FROM_EMAIL || !to) return false;
    try {
        const r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: `Mont°6 <${env.BOOKING_FROM_EMAIL}>`, to, subject, html }),
        });
        if (!r.ok) { console.error('Resend error:', r.status, await r.text()); return false; }
        return true;
    } catch (e) {
        console.error('Resend fetch failed:', e);
        return false;
    }
}

const shell = (title, body) => `
  <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;color:#26231F">
    <h1 style="font-family:Georgia,serif;color:#A8854C;font-weight:500">${title}</h1>
    ${body}
    <p style="color:#6E675C;font-size:13px;margin-top:24px">Mont°6 Luxury Retreat · Cefalù, Sicilia<br>
    📍 Centro storico · 📞 +39 388 190 8816</p>
  </div>`;

function prearrivalHtml(b) {
    return shell('Ti aspettiamo a Mont°6 ✨', `
    <p>Ciao ${b.guest_name || ''}, mancano pochi giorni al tuo arrivo (check-in <strong>${b.check_in}</strong>). Ecco le informazioni utili:</p>
    <ul style="line-height:1.9">
      <li>🕒 <strong>Check-in</strong> dalle 15:00 · <strong>Check-out</strong> entro le 10:00</li>
      <li>🔑 <strong>Self check-in</strong> con serratura digitale: ti invieremo il codice il giorno dell'arrivo</li>
      <li>🚗 <strong>Parcheggio</strong> consigliato: "Parcheggio Coco" sul lungomare (~5 min a piedi)</li>
      <li>📶 <strong>Wi-Fi</strong> in fibra incluso</li>
    </ul>
    <p>Per qualsiasi cosa rispondi a questa email o scrivici su WhatsApp al +39 388 190 8816. Buon viaggio! 🌊</p>`);
}

function reviewHtml(b, env) {
    const reviewBtn = env.REVIEW_URL
        ? `<p style="margin:20px 0"><a href="${env.REVIEW_URL}" style="background:#A8854C;color:#fff;text-decoration:none;padding:12px 24px;border-radius:4px">Lascia una recensione</a></p>`
        : '';
    return shell('Grazie per essere stato con noi 🙏', `
    <p>Ciao ${b.guest_name || ''}, speriamo tu abbia trascorso un soggiorno indimenticabile a Cefalù.</p>
    <p>La tua opinione è preziosa e aiuta altri ospiti a scegliere Mont°6: ti va di lasciarci una breve recensione?</p>
    ${reviewBtn}
    <p>Se invece c'è qualcosa che possiamo migliorare, rispondi pure a questa email: ti leggiamo con piacere.</p>
    <p>A presto, e grazie ancora! ☀️</p>`);
}
