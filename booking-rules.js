/** Shared by the browser and Checkout. Dates are UTC calendar dates; checkout is exclusive. */
export function minimumStayNights(checkIn, checkOut) {
    if (!Number.isFinite(+checkIn) || !Number.isFinite(+checkOut) || checkOut <= checkIn) {
        throw new RangeError('A valid arrival and departure are required');
    }
    for (let year = checkIn.getUTCFullYear(); year <= checkOut.getUTCFullYear(); year++) {
        // A departure on July 1 does not include a July night; August 31 does.
        if (+checkIn < Date.UTC(year, 8, 1) && +checkOut > Date.UTC(year, 6, 1)) return 3;
    }
    return 2;
}

export function minimumStayMessage(nights, lang) {
    if (nights === 3) return lang === 'en'
        ? 'The minimum stay is 3 nights when your stay includes a night in July or August.'
        : 'Il soggiorno minimo è di 3 notti se il soggiorno comprende una notte a luglio o agosto.';
    return lang === 'en' ? 'The minimum stay is 2 nights.' : 'Il soggiorno minimo è di 2 notti.';
}
