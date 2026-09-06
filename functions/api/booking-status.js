import { json, stripe, recordPaidSession } from '../_lib/payment.js';

export async function onRequestGet({ request, env }) {
    const id = new URL(request.url).searchParams.get('session_id');
    if (!id || !/^cs_(test_|live_)?[a-zA-Z0-9]{8,240}$/.test(id)) return json(400, { status: 'invalid' });
    if (!env.DB || !env.STRIPE_SECRET_KEY) return json(503, { status: 'unavailable' });
    try {
        const session = await stripe(env, `checkout/sessions/${encodeURIComponent(id)}`);
        if (session.mode !== 'payment' || !session.metadata?.checkIn) return json(404, { status: 'invalid' });
        if (session.payment_status !== 'paid') return json(200, { status: session.status === 'expired' ? 'expired' : 'pending' });
        const booking = await recordPaidSession(env, session);
        // The unguessable session ID is a bearer token. Return no names/emails.
        return json(200, { status: booking.status === 'confirmed' ? 'confirmed' : 'cancelled',
            ...(booking.status === 'confirmed' ? { checkIn: booking.check_in, checkOut: booking.check_out,
                guests: booking.guests, amount: booking.amount_total, currency: booking.currency } : {}) });
    } catch (error) {
        console.error('Booking status unavailable:', error.message);
        return json(error.status === 404 ? 404 : 503, { status: error.status === 404 ? 'invalid' : 'unavailable' });
    }
}
