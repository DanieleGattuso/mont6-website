/**
 * Cloudflare Pages Function — GET /api/get-booked-dates
 * Restituisce le date già occupate: blocchi manuali (blocked-dates.json),
 * calendari iCal esterni (Airbnb/Booking, se configurati) e prenotazioni
 * dirette pagate (database D1). Logica condivisa in ../_lib/booked.js.
 */

import { getBookedRanges } from '../_lib/booked.js';

const JSON_HEADERS = {
    'Access-Control-Allow-Origin': 'https://mont6cefalu.it',
    'Content-Type': 'application/json',
};

export function onRequestOptions() {
    return new Response('', {
        headers: {
            'Access-Control-Allow-Origin': 'https://mont6cefalu.it',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
        },
    });
}

export async function onRequestGet({ request, env }) {
    const bookedDates = await getBookedRanges({ request, env });
    return new Response(JSON.stringify(bookedDates), { headers: JSON_HEADERS });
}
