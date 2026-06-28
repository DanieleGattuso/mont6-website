/**
 * Cloudflare Pages Function — GET /api/get-booked-dates
 * Restituisce le date già prenotate (file statico blocked-dates.json +
 * eventuale calendario Airbnb iCal se la variabile AIRBNB_ICAL_URL è impostata).
 */

const JSON_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
};

export function onRequestOptions() {
    return new Response('', {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
        },
    });
}

export async function onRequestGet({ request, env }) {
    let bookedDates = [];

    // 1. Date bloccate manualmente (file statico servito da Cloudflare Pages)
    try {
        const res = await fetch(new URL('/blocked-dates.json', request.url));
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) bookedDates = data;
        }
    } catch (e) {
        console.error('Errore nella lettura di blocked-dates.json:', e);
    }

    // 2. Calendari esterni opzionali (iCal): Airbnb + Booking.com.
    //    Attivi solo se le rispettive variabili d'ambiente sono impostate.
    const icalFeeds = [
        { name: 'Airbnb', url: env.AIRBNB_ICAL_URL },
        { name: 'Booking', url: env.BOOKING_ICAL_URL },
    ].filter((f) => f.url);

    for (const feed of icalFeeds) {
        try {
            const response = await fetch(feed.url);
            if (response.ok) {
                const icsText = await response.text();
                const events = icsText.split('BEGIN:VEVENT');

                for (let i = 1; i < events.length; i++) {
                    const ev = events[i];
                    const startMatch = ev.match(/DTSTART.*?:.*?(\d{8})/);
                    const endMatch = ev.match(/DTEND.*?:.*?(\d{8})/);

                    if (startMatch && endMatch) {
                        const s = startMatch[1]; // "YYYYMMDD"
                        const e = endMatch[1];
                        bookedDates.push({
                            from: `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`,
                            to: `${e.slice(0, 4)}-${e.slice(4, 6)}-${e.slice(6, 8)}`,
                        });
                    }
                }
            } else {
                console.error(`Errore caricamento calendario ${feed.name}. Status: ${response.status}`);
            }
        } catch (err) {
            console.error(`Errore durante il recupero del calendario ${feed.name}:`, err);
        }
    }

    // 3. Prenotazioni dirette pagate (database D1) — bloccate automaticamente dopo il pagamento
    if (env.DB) {
        try {
            const { results } = await env.DB.prepare(
                `SELECT check_in, check_out FROM bookings WHERE status = 'confirmed'`
            ).all();
            for (const row of results || []) {
                if (row.check_in && row.check_out) {
                    bookedDates.push({ from: row.check_in, to: row.check_out });
                }
            }
        } catch (e) {
            console.error('Errore lettura prenotazioni D1:', e);
        }
    }

    return new Response(JSON.stringify(bookedDates), { headers: JSON_HEADERS });
}
