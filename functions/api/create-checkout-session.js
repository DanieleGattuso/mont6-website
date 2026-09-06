import { getBookedRanges, overlapsBooked } from '../_lib/booked.js';
import { DAY, MONTHS, parseDate, isoDate, todayInRome, json, readAsset, stripe, reconcileHolds } from '../_lib/payment.js';

export async function onRequestPost({ request, env }) {
    let lang = 'it';
    const t = (it, en) => lang === 'en' ? en : it;
    const unavailable = () => json(503, { error: t(
        'Non riesco a verificare la prenotazione in questo momento. Riprova o scrivimi su WhatsApp.',
        'I cannot verify your booking right now. Try again or message me on WhatsApp.') });
    try {
        const origin = new URL(request.url).origin;
        if (request.headers.get('Origin') && request.headers.get('Origin') !== origin) return json(403, { error: 'Origin not allowed' });
        let body;
        try {
            const text = await request.text();
            if (text.length > 4096) return json(413, { error: 'Request too large' });
            body = JSON.parse(text);
        } catch { return json(400, { error: 'Richiesta non valida. / Invalid request.' }); }
        if (!body || typeof body !== 'object' || Array.isArray(body)) return json(400, { error: 'Invalid request' });
        lang = body.lang === 'en' ? 'en' : 'it';
        if (!env.DB || !env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) return unavailable();
        const start = parseDate(body.checkIn), end = parseDate(body.checkOut);
        const guests = typeof body.guests === 'number' || typeof body.guests === 'string' ? Number(body.guests) : NaN;
        if (!start || !end || isoDate(start) < todayInRome() || (end - start) / DAY < 2
            || (end - start) / DAY > 365 || ![1, 2].includes(guests)) {
            return json(400, { error: t('Scegli date valide, da oggi in poi, per almeno 2 notti e 1 o 2 ospiti. Per soggiorni oltre un anno, contattami.',
                'Choose valid dates from today, for at least 2 nights and 1 or 2 guests. For stays over a year, contact me.') });
        }
        const checkIn = isoDate(start), checkOut = isoDate(end);
        const id = body.requestId || crypto.randomUUID();
        if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id)) return json(400, { error: 'Invalid request identifier' });
        let hold = await env.DB.prepare('SELECT * FROM checkout_holds WHERE id = ?').bind(id).first();
        let createdHere = false;
        if (hold) {
            if (body.expectedAmount !== undefined && body.expectedAmount !== hold.amount_total) return json(409, { error: t('Il prezzo è cambiato. Ricarica la pagina per verificare il totale.', 'The price changed. Reload the page to review the total.') });
            if (hold.check_in !== checkIn || hold.check_out !== checkOut || hold.guests !== guests || hold.lang !== lang || hold.origin !== origin) {
                return json(409, { error: t('La selezione è cambiata. Aggiorna la pagina e riprova.', 'Your selection changed. Refresh the page and try again.') });
            }
            if (hold.status !== 'active') return json(409, { error: t('Questo pagamento è già concluso o scaduto. Aggiorna la pagina.', 'This payment is already complete or expired. Refresh the page.'), resetRequest: true });
            if (hold.stripe_session_id) {
                const session = await stripe(env, `checkout/sessions/${encodeURIComponent(hold.stripe_session_id)}`);
                if (session.status === 'open' && session.url) return json(200, { url: session.url });
                return json(409, { error: t('Il pagamento è concluso o scaduto. Controlla la conferma o aggiorna il calendario.',
                    'The payment is complete or expired. Check your confirmation or refresh the calendar.'), resetRequest: true });
            }
        } else {
            await reconcileHolds(env, checkIn, checkOut);
            const { ranges, partial } = await getBookedRanges({ request, env });
            if (partial) return unavailable();
            if (overlapsBooked(checkIn, checkOut, ranges)) return json(409, { error: t(
                'Le date sono occupate o riservate per un pagamento in corso. Scegline altre o riprova più tardi.',
                'These dates are booked or held for a payment in progress. Choose other dates or try again later.') });
            const response = await readAsset(request, env, '/prezzi.json');
            const prices = response.ok ? await response.json() : null;
            if (!prices || !MONTHS.every(m => Number.isFinite(prices[m]) && prices[m] > 0)) return unavailable();
            let amount = 0;
            for (let day = +start; day < +end; day += DAY) amount += Math.round(prices[MONTHS[new Date(day).getUTCMonth()]] * 100);
            if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 99999999) return unavailable();
            if (body.expectedAmount !== undefined && body.expectedAmount !== amount) return json(409, { error: t('Il prezzo è cambiato. Ricarica la pagina per verificare il totale.', 'The price changed. Reload the page to review the total.') });
            hold = { id, check_in: checkIn, check_out: checkOut, guests, amount_total: amount,
                lang, origin, expires_at: Math.floor(Date.now() / 1000) + 35 * 60 };
            // This single SQL statement arbitrates concurrent customers.
            const inserted = await env.DB.prepare(`INSERT INTO checkout_holds
                (id, check_in, check_out, guests, amount_total, lang, origin, expires_at)
                SELECT ?, ?, ?, ?, ?, ?, ?, ?
                WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE status = 'confirmed' AND check_in < ? AND check_out > ?)
                  AND NOT EXISTS (SELECT 1 FROM checkout_holds WHERE status = 'active' AND check_in < ? AND check_out > ?)`)
                .bind(id, checkIn, checkOut, guests, amount, lang, origin, hold.expires_at,
                    checkOut, checkIn, checkOut, checkIn).run();
            if (!inserted.meta.changes) return json(409, { error: t('Le date sono appena state riservate. Scegline altre o riprova più tardi.',
                'These dates have just been reserved. Choose others or try again later.') });
            createdHere = true;
        }
        const nights = (end - start) / DAY;
        const params = new URLSearchParams({
            mode: 'payment', locale: lang, submit_type: 'book',
            'payment_method_types[0]': 'card', expires_at: String(hold.expires_at),
            success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}${lang === 'en' ? '&lang=en' : ''}`,
            cancel_url: `${origin}/${lang === 'en' ? 'en/' : ''}#booking`,
            'line_items[0][quantity]': '1', 'line_items[0][price_data][currency]': 'eur',
            'line_items[0][price_data][unit_amount]': String(hold.amount_total),
            'line_items[0][price_data][product_data][name]': 'Mont°6 · Cefalù',
            'line_items[0][price_data][product_data][description]': `${checkIn} → ${checkOut} · ${nights} ${t('notti', 'nights')} · ${guests} ${t('ospiti', 'guests')}`,
            'metadata[checkIn]': checkIn, 'metadata[checkOut]': checkOut,
            'metadata[guests]': String(guests), 'metadata[totalNights]': String(nights),
            'metadata[holdId]': id, 'metadata[lang]': lang,
        });
        let session;
        try { session = await stripe(env, 'checkout/sessions', { body: params, key: `mont6-checkout-${id}` }); }
        catch (error) {
            // A timeout or 5xx may hide a payable session: retain its hold.
            if (createdHere && [400, 401, 403, 404].includes(error.status)) {
                await env.DB.prepare("UPDATE checkout_holds SET status = 'released' WHERE id = ?").bind(id).run();
            }
            throw error;
        }
        if (!session.id || !session.url) throw new Error('Incomplete Checkout response');
        await env.DB.prepare('UPDATE checkout_holds SET stripe_session_id = ? WHERE id = ?').bind(session.id, id).run();
        return json(200, { url: session.url });
    } catch (error) {
        console.error('Checkout unavailable:', error.message);
        return unavailable();
    }
}
