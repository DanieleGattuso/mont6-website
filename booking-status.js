(async function () {
    const en = document.documentElement.dataset.lang === 'en';
    const t = (it, english) => en ? english : it;
    const title = document.getElementById('booking-status-title');
    const message = document.getElementById('booking-status-message');
    const details = document.getElementById('booking-status-details');
    document.getElementById('booking-home').href = en ? '/en/' : '/?lang=it';
    const show = (heading, text) => { title.textContent = heading; message.textContent = text; document.title = `Mont°6 — ${heading}`; };
    const id = new URLSearchParams(location.search).get('session_id');
    if (!id) {
        show(t('Nessuna prenotazione da verificare', 'No booking to verify'),
            t('Questa pagina si apre al termine del pagamento. Se hai già pagato, scrivimi su WhatsApp.',
                'This page opens after payment. If you already paid, message me on WhatsApp.'));
        return;
    }
    for (let attempt = 0; attempt < 8; attempt++) {
        try {
            const response = await fetch(`/api/booking-status?session_id=${encodeURIComponent(id)}`, {
                cache: 'no-store', signal: AbortSignal.timeout(12000),
            });
            const data = await response.json();
            if (response.ok && data.status === 'confirmed') {
                show(t('Prenotazione confermata', 'Booking confirmed'),
                    t('Il pagamento è verificato e le date sono riservate per te.', 'Your payment is verified and your dates are reserved.'));
                document.getElementById('confirmed-icon').hidden = false;
                const date = value => new Intl.DateTimeFormat(en ? 'en-GB' : 'it-IT', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value + 'T00:00:00Z'));
                details.textContent = `${date(data.checkIn)} → ${date(data.checkOut)} · ${data.guests} ${t('ospiti', 'guests')} · ${new Intl.NumberFormat(en ? 'en-GB' : 'it-IT', { style: 'currency', currency: data.currency }).format(data.amount / 100)}`;
                details.hidden = false;
                try { sessionStorage.removeItem('mont6_sel'); sessionStorage.removeItem('mont6_checkout'); } catch { /* optional storage */ }
                return;
            }
            if (data.status === 'cancelled' || data.status === 'expired' || data.status === 'invalid') {
                show(t('Prenotazione non confermata', 'Booking not confirmed'),
                    data.status === 'cancelled'
                        ? t('Questa prenotazione è stata annullata. Per chiarimenti scrivimi su WhatsApp.', 'This booking was cancelled. Message me on WhatsApp for details.')
                        : t('Il pagamento è scaduto o il collegamento non è valido. Se hai già pagato, contattami prima di riprovare.', 'The payment expired or the link is invalid. If you already paid, contact me before trying again.'));
                return;
            }
        } catch { /* Brief interruptions are retried; never fabricate a confirmation. */ }
        if (attempt < 7) await new Promise(resolve => setTimeout(resolve, 2000));
    }
    show(t('Conferma ancora in verifica', 'Confirmation still being checked'),
        t('Non effettuare un secondo pagamento. Ricarica questa pagina tra poco oppure scrivimi su WhatsApp per verificare la prenotazione.',
            'Do not pay a second time. Reload this page shortly or message me on WhatsApp to check your booking.'));
})();
