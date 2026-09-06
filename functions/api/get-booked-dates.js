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
    'Cache-Control': 'no-store',
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
    // A saved, unguessable request ID lets its owner resume their own Checkout.
    const id = new URL(request.url).searchParams.get('request_id') || '';
    const excludeHoldId = /^[a-f0-9-]{36}$/i.test(id) ? id : '';
    const { ranges, partial } = await getBookedRanges({ request, env, excludeHoldId });
    // partial = una fonte non ha risposto: il client lo dice all'ospite
    return new Response(JSON.stringify({ ranges, partial }), { headers: JSON_HEADERS });
}
