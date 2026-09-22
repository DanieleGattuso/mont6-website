/** Keep published versions unchanged so delayed confirmations retain their original terms. */
export const CURRENT_TERMS_VERSION = '2026-09-22';
export const HOST_CONTACT = Object.freeze({
    name: 'Daniele Gattuso',
    property: 'Mont°6',
    address: 'Vicolo Monteleone 6, 90015 Cefalù (PA)',
    email: 'mont6.home@gmail.com',
    phone: '+39 388 190 8816',
});

const TERMS = Object.freeze({
    '2026-09-22': Object.freeze({
        it: Object.freeze({
            title: 'Condizioni della prenotazione',
            cancellation: 'Cancellazione: rimborso del 100% con almeno 14 giorni di preavviso rispetto all’arrivo; rimborso del 50% da 7 a meno di 14 giorni; nessun rimborso con meno di 7 giorni o in caso di mancato arrivo.',
            cancellationRequest: 'Per cancellare, scrivi a mont6.home@gmail.com o su WhatsApp al +39 388 190 8816.',
            touristTax: 'L’imposta di soggiorno è indicata a parte, non è inclusa nel pagamento online e si paga all’arrivo.',
            versionLabel: 'Versione',
            landlordLabel: 'Locatore',
            detailsLabel: 'Informazioni sulla cancellazione',
            detailsUrl: 'https://mont6cefalu.it/#cancellation-policy',
        }),
        en: Object.freeze({
            title: 'Your booking terms',
            cancellation: 'Cancellation: a 100% refund with at least 14 days’ notice before arrival; a 50% refund with at least 7 but fewer than 14 days’ notice; no refund with less than 7 days’ notice or in the event of a no-show.',
            cancellationRequest: 'To cancel, email mont6.home@gmail.com or message +39 388 190 8816 on WhatsApp.',
            touristTax: 'Tourist tax is shown separately, is not included in the online payment and is payable on arrival.',
            versionLabel: 'Version',
            landlordLabel: 'Landlord',
            detailsLabel: 'Cancellation information',
            detailsUrl: 'https://mont6cefalu.it/en/#cancellation-policy',
        }),
    }),
});

export function getBookingTerms(version, lang) {
    if (!Object.hasOwn(TERMS, version)) return null;
    return TERMS[version][lang === 'en' ? 'en' : 'it'];
}

export function checkoutTermsText(version, lang) {
    const terms = getBookingTerms(version, lang);
    if (!terms) return '';
    return `${terms.title} (${version}). ${terms.cancellation} ${terms.touristTax} ${terms.landlordLabel}: ${HOST_CONTACT.name}, ${HOST_CONTACT.property}, ${HOST_CONTACT.address}. ${terms.cancellationRequest}`;
}
