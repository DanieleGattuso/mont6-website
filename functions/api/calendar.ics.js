/**
 * Cloudflare Pages Function — GET /api/calendar.ics
 *
 * Pubblica le prenotazioni DIRETTE (pagate sul sito, salvate in D1) come feed iCal,
 * così Airbnb e Booking.com possono importarle e bloccare quelle date sui loro portali.
 * → Incolla questo URL nella sezione "Importa calendario" di Airbnb/Booking:
 *      https://mont6cefalu.it/api/calendar.ics
 *
 * Binding richiesto: DB (database D1 "mont6-bookings"). Senza, restituisce un calendario vuoto.
 */

function toICalDate(iso) {
    // "YYYY-MM-DD" -> "YYYYMMDD"
    return (iso || '').replaceAll('-', '');
}

export async function onRequestGet({ env }) {
    let rows = [];
    if (env.DB) {
        try {
            const { results } = await env.DB.prepare(
                `SELECT id, check_in, check_out FROM bookings WHERE status = 'confirmed'`
            ).all();
            rows = results || [];
        } catch (e) {
            console.error('Errore lettura D1 per iCal:', e);
        }
    }

    const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Mont6//Direct Bookings//IT',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
    ];

    for (const r of rows) {
        if (!r.check_in || !r.check_out) continue;
        lines.push(
            'BEGIN:VEVENT',
            `UID:booking-${r.id}@mont6cefalu.it`,
            `DTSTAMP:${stamp}`,
            `DTSTART;VALUE=DATE:${toICalDate(r.check_in)}`,
            `DTEND;VALUE=DATE:${toICalDate(r.check_out)}`, // DTEND esclusivo: blocca le notti check_in..check_out-1
            'SUMMARY:Prenotazione diretta (Mont°6)',
            'END:VEVENT'
        );
    }

    lines.push('END:VCALENDAR');

    return new Response(lines.join('\r\n'), {
        headers: {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Cache-Control': 'no-cache',
        },
    });
}
