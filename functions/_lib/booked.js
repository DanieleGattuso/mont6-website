/**
 * Libreria condivisa — raccolta di tutte le date occupate.
 * Usata da /api/get-booked-dates (calendario sul sito) e da
 * /api/create-checkout-session (blocco anti doppia-prenotazione).
 *
 * Ogni intervallo restituito è { from, to } in formato "YYYY-MM-DD",
 * con entrambi gli estremi INCLUSIVI (notti occupate).
 * Nota iCal: DTEND è esclusivo (è il giorno di check-out, libero per un
 * nuovo check-in), quindi viene riportato al giorno precedente.
 */

function shiftISO(iso, days) {
    const d = new Date(iso + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

export async function getBookedRanges({ request, env }) {
    const ranges = [];

    // 1. Date bloccate manualmente (file statico, estremi già inclusivi)
    try {
        const res = await fetch(new URL('/blocked-dates.json', request.url));
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
                for (const r of data) {
                    if (r && r.from && r.to) ranges.push({ from: r.from, to: r.to });
                }
            }
        }
    } catch (e) {
        console.error('Errore nella lettura di blocked-dates.json:', e);
    }

    // 2. Calendari esterni opzionali (iCal): Airbnb + Booking.com
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
                        const from = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
                        // DTEND esclusivo → l'ultima notte occupata è il giorno prima
                        const to = shiftISO(`${e.slice(0, 4)}-${e.slice(4, 6)}-${e.slice(6, 8)}`, -1);
                        if (to >= from) ranges.push({ from, to });
                    }
                }
            } else {
                console.error(`Errore caricamento calendario ${feed.name}. Status: ${response.status}`);
            }
        } catch (err) {
            console.error(`Errore durante il recupero del calendario ${feed.name}:`, err);
        }
    }

    // 3. Prenotazioni dirette pagate (D1) — check_out è il giorno di partenza, libero
    if (env.DB) {
        try {
            const { results } = await env.DB.prepare(
                `SELECT check_in, check_out FROM bookings WHERE status = 'confirmed'`
            ).all();
            for (const row of results || []) {
                if (row.check_in && row.check_out) {
                    const to = shiftISO(row.check_out, -1);
                    if (to >= row.check_in) ranges.push({ from: row.check_in, to });
                }
            }
        } catch (e) {
            console.error('Errore lettura prenotazioni D1:', e);
        }
    }

    return ranges;
}

/**
 * Verifica se un soggiorno [checkIn, checkOut) si sovrappone alle date occupate.
 * Le notti del soggiorno vanno da checkIn a checkOut-1 (il check-out è una partenza).
 * Date in formato ISO "YYYY-MM-DD"; il confronto lessicografico è sufficiente.
 */
export function overlapsBooked(checkInISO, checkOutISO, ranges) {
    const lastNight = shiftISO(checkOutISO, -1);
    return ranges.some((r) => checkInISO <= r.to && lastNight >= r.from);
}
