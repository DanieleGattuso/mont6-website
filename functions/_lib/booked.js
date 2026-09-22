import { parseDate, isoDate, readAsset } from './payment.js';
import { readBoundedText } from './body.js';

const shiftISO = (iso, days) => {
    const d = parseDate(iso);
    if (!d) throw new Error('Invalid calendar date');
    d.setUTCDate(d.getUTCDate() + days);
    return isoDate(d);
};

export function parseCalendar(text) {
    const unfolded = text.replace(/\r?\n[ \t]/g, '');
    if (!/^BEGIN:VCALENDAR\s*$/m.test(unfolded) || !/^END:VCALENDAR\s*$/m.test(unfolded)) throw new Error('Invalid iCal feed');
    const ranges = [];
    const events = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
    if ((unfolded.match(/BEGIN:VEVENT/g) || []).length !== events.length) throw new Error('Truncated iCal feed');
    for (const ev of events) {
        if (/^STATUS:CANCELLED\s*$/m.test(ev)) continue;
        // Rental exports use all-day events. Unsupported recurrence must not look free.
        if (/^(RRULE|RDATE|EXDATE)[;:]/m.test(ev)) throw new Error('Unsupported recurring iCal event');
        const start = /^DTSTART(?:;[^:\r\n]*)?:(\d{8})\s*$/m.exec(ev);
        const end = /^DTEND(?:;[^:\r\n]*)?:(\d{8})\s*$/m.exec(ev);
        if (!start || !end) throw new Error('Unsupported or incomplete iCal dates');
        const format = x => `${x.slice(0, 4)}-${x.slice(4, 6)}-${x.slice(6, 8)}`;
        const from = format(start[1]), checkout = format(end[1]);
        if (!parseDate(from) || !parseDate(checkout) || checkout <= from) throw new Error('Invalid iCal range');
        ranges.push({ from, to: shiftISO(checkout, -1) });
    }
    return ranges;
}

export async function getBookedRanges({ request, env, excludeHoldId = '' }) {
    const ranges = [];
    let partial = false;
    try {
        const response = await readAsset(request, env, '/blocked-dates.json');
        if (!response.ok) throw new Error(`Manual calendar HTTP ${response.status}`);
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Manual calendar must be an array');
        for (const r of data) {
            if (!r || !/^\d{4}-\d{2}-\d{2}$/.test(r.from) || !/^\d{4}-\d{2}-\d{2}$/.test(r.to)
                || !parseDate(r.from) || !parseDate(r.to) || r.to < r.from) throw new Error('Invalid manual calendar range');
            ranges.push({ from: r.from, to: r.to });
        }
    } catch (e) { partial = true; console.error('Manual calendar unavailable:', e.message); }

    const sources = { airbnb: env.AIRBNB_ICAL_URL, booking: env.BOOKING_ICAL_URL };
    // Production sets "airbnb,booking". Omission preserves deliberately standalone setups.
    const required = String(env.REQUIRED_ICAL_SOURCES || '').split(',').map(name => name.trim().toLowerCase()).filter(Boolean);
    if (required.some(name => !Object.hasOwn(sources, name) || !sources[name])) {
        partial = true;
        console.error('Required external calendar configuration is incomplete');
    }
    for (const url of Object.values(sources).filter(Boolean)) {
        try {
            const response = await fetch(url, { signal: AbortSignal.timeout(8000), cache: 'no-store' });
            if (!response.ok) throw new Error(`iCal HTTP ${response.status}`);
            ranges.push(...parseCalendar(await readBoundedText(response, 1048576)));
        } catch (e) { partial = true; console.error('External calendar unavailable:', e.message); }
    }
    if (!env.DB) partial = true;
    else {
        try {
            const { results } = await env.DB.prepare(`SELECT check_in, check_out FROM bookings WHERE status = 'confirmed'
                UNION ALL SELECT check_in, check_out FROM checkout_holds WHERE status = 'active' AND id != ?`).bind(excludeHoldId).all();
            for (const row of results || []) {
                if (!parseDate(row.check_in) || !parseDate(row.check_out) || row.check_out <= row.check_in) throw new Error('Invalid DB range');
                ranges.push({ from: row.check_in, to: shiftISO(row.check_out, -1) });
            }
        } catch (e) { partial = true; console.error('Booking calendar unavailable:', e.message); }
    }
    // Merge overlapping/adjacent ranges so check-out logic also handles one-night blocks.
    const merged = [];
    for (const r of ranges.sort((a, b) => a.from.localeCompare(b.from))) {
        const last = merged[merged.length - 1];
        if (last && r.from <= shiftISO(last.to, 1)) last.to = last.to > r.to ? last.to : r.to;
        else merged.push({ ...r });
    }
    return { ranges: merged, partial };
}

export function overlapsBooked(checkIn, checkOut, ranges) {
    return ranges.some(r => checkIn <= r.to && checkOut > r.from);
}
