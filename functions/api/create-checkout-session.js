/**
 * Cloudflare Pages Function — POST /api/create-checkout-session
 * Crea una sessione di Stripe Checkout chiamando direttamente l'API REST di
 * Stripe via fetch (nessuna dipendenza npm, compatibile col runtime Workers).
 * Richiede la variabile d'ambiente STRIPE_SECRET_KEY impostata su Cloudflare.
 */

const MONTHS = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];
const FALLBACK_PRICE = 150;

function getPriceForDate(date, prezzi) {
    const name = MONTHS[date.getMonth()];
    return (prezzi && prezzi[name]) || FALLBACK_PRICE;
}

function json(status, obj) {
    return new Response(JSON.stringify(obj), {
        status,
        headers: { 'Access-Control-Allow-Origin': 'https://mont6cefalu.it', 'Content-Type': 'application/json' },
    });
}

export function onRequestOptions() {
    return new Response('', {
        headers: {
            'Access-Control-Allow-Origin': 'https://mont6cefalu.it',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
        },
    });
}

export async function onRequestPost({ request, env }) {
    try {
        if (!env.STRIPE_SECRET_KEY) {
            return json(500, { error: 'Pagamento non configurato: chiave Stripe mancante sul server.' });
        }

        const { checkIn, checkOut, guests } = await request.json();

        if (!checkIn || !checkOut) {
            return json(400, { error: 'Date di Check-in e Check-out obbligatorie.' });
        }

        // Converte "dd/mm/yyyy" in oggetto Date
        const parseDate = (dateStr) => {
            const [day, month, year] = dateStr.split('/');
            return new Date(year, month - 1, day);
        };

        const startDate = parseDate(checkIn);
        const endDate = parseDate(checkOut);
        const totalNights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

        if (!(totalNights > 0)) {
            return json(400, { error: 'La data di check-out deve essere successiva al check-in.' });
        }
        if (totalNights < 2) {
            return json(400, { error: 'Il soggiorno minimo per Mont°6 è di 2 notti.' });
        }

        const guestNum = parseInt(guests, 10);
        if (isNaN(guestNum) || guestNum < 1 || guestNum > 2) {
            return json(400, { error: 'Il numero massimo di ospiti consentito è 2.' });
        }

        // Tariffe per mese (file statico servito da Cloudflare Pages)
        let prezzi = null;
        try {
            const r = await fetch(new URL('/prezzi.json', request.url));
            if (r.ok) prezzi = await r.json();
        } catch (e) {
            console.error('Errore lettura prezzi.json:', e);
        }

        // Totale notte per notte (gestisce soggiorni a cavallo di due mesi)
        let totalAmountCent = 0;
        const cursor = new Date(startDate);
        for (let i = 0; i < totalNights; i++) {
            totalAmountCent += getPriceForDate(cursor, prezzi) * 100; // Stripe usa i centesimi
            cursor.setDate(cursor.getDate() + 1);
        }

        const origin = new URL(request.url).origin;
        const description = `Dal ${checkIn} al ${checkOut} • ${totalNights} ${totalNights === 1 ? 'notte' : 'notti'} • ${guests} ${guests === '1' ? 'ospite' : 'ospiti'}`;

        // Corpo form-encoded per l'API Stripe
        const params = new URLSearchParams();
        params.set('mode', 'payment');
        params.set('success_url', `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`);
        params.set('cancel_url', `${origin}/#booking`);
        params.set('line_items[0][quantity]', '1');
        params.set('line_items[0][price_data][currency]', 'eur');
        params.set('line_items[0][price_data][unit_amount]', String(totalAmountCent));
        params.set('line_items[0][price_data][product_data][name]', 'Soggiorno presso Mont°6 Cefalù');
        params.set('line_items[0][price_data][product_data][description]', description);
        params.set('line_items[0][price_data][product_data][images][0]', 'https://mont6cefalu.it/img/_MG_4132.jpg');
        params.set('metadata[checkIn]', checkIn);
        params.set('metadata[checkOut]', checkOut);
        params.set('metadata[guests]', String(guests));
        params.set('metadata[totalNights]', String(totalNights));

        const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params,
        });

        const session = await resp.json();

        if (!resp.ok) {
            console.error('Errore API Stripe:', session);
            const msg = (session && session.error && session.error.message) || 'Errore nella creazione del pagamento.';
            return json(502, { error: msg });
        }

        return json(200, { url: session.url });
    } catch (error) {
        console.error('Errore creazione sessione Stripe:', error);
        return json(500, { error: 'Errore interno al server nella creazione del pagamento.' });
    }
}
