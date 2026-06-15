const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Funzione ausiliaria per calcolare il prezzo per ogni specifica notte del soggiorno.
// Questo risolve automaticamente i soggiorni a cavallo di due mesi con tariffe diverse!
function getPriceForDate(date) {
    const monthIndex = date.getMonth(); // 0 = Gennaio, 11 = Dicembre
    
    const monthsMapping = {
        0: "Gennaio",
        1: "Febbraio",
        2: "Marzo",
        3: "Aprile",
        4: "Maggio",
        5: "Giugno",
        6: "Luglio",
        7: "Agosto",
        8: "Settembre",
        9: "Ottobre",
        10: "Novembre",
        11: "Dicembre"
    };

    const monthName = monthsMapping[monthIndex];
    
    try {
        // Carica dinamicamente il file prezzi.json (esbuild lo includerà nel bundle su Netlify)
        const prezzi = require('../../prezzi.json');
        return prezzi[monthName] || 150;
    } catch (e) {
        console.error("Errore nel caricamento di prezzi.json:", e);
        return 150; // Tariffa di fallback in caso di errore
    }
}

exports.handler = async (event) => {
    // Rispondi alle chiamate OPTIONS per CORS (necessario se chiamato da domini diversi o in locale)
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: 'Method Not Allowed'
        };
    }

    try {
        const { checkIn, checkOut, guests } = JSON.parse(event.body);

        if (!checkIn || !checkOut) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Date di Check-in e Check-out obbligatorie.' })
            };
        }

        // Converte le date da formato "dd/mm/yyyy" a oggetto Date
        const parseDate = (dateStr) => {
            const [day, month, year] = dateStr.split('/');
            return new Date(year, month - 1, day);
        };

        const startDate = parseDate(checkIn);
        const endDate = parseDate(checkOut);

        // Calcola la differenza in giorni (notti)
        const diffTime = endDate - startDate;
        const totalNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (totalNights <= 0 || isNaN(totalNights)) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'La data di check-out deve essere successiva al check-in.' })
            };
        }

        // Verifica soggiorno minimo di 2 notti
        if (totalNights < 2) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Il soggiorno minimo per Mont°6 è di 2 notti.' })
            };
        }

        // Verifica numero massimo di ospiti
        const guestNum = parseInt(guests, 10);
        if (isNaN(guestNum) || guestNum < 1 || guestNum > 2) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Il numero massimo di ospiti consentito è 2.' })
            };
        }

        // Calcola il totale scorrendo giorno per giorno
        let totalAmountCent = 0;
        let currentDate = new Date(startDate);

        for (let i = 0; i < totalNights; i++) {
            const priceForNight = getPriceForDate(currentDate);
            totalAmountCent += priceForNight * 100; // Stripe richiede i centesimi (es. 100 = 1 EUR)
            currentDate.setDate(currentDate.getDate() + 1); // Passa alla notte successiva
        }

        // Determina il dominio per il reindirizzamento di successo/annullamento
        // In locale usa localhost, in produzione usa il dominio del sito
        const host = event.headers.host || 'mont6cefalu.it';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const baseUrl = `${protocol}://${host}`;

        // Crea la sessione di checkout di Stripe
        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: 'Soggiorno presso Mont°6 Cefalù',
                            description: `Dal ${checkIn} al ${checkOut} • ${totalNights} ${totalNights === 1 ? 'notte' : 'notti'} • ${guests} ${guests === '1' ? 'ospite' : 'ospiti'}`,
                            images: ['https://mont6cefalu.it/img/_MG_4132.jpg'] // URL assoluto dell'immagine per il checkout Stripe
                        },
                        unit_amount: totalAmountCent,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/#booking`,
            // Consente di raccogliere dati aggiuntivi per facilitare la gestione
            metadata: {
                checkIn,
                checkOut,
                guests,
                totalNights: totalNights.toString()
            }
        });

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url: session.url })
        };

    } catch (error) {
        console.error('Errore creazione sessione Stripe:', error);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Errore interno al server nella creazione del pagamento.' })
        };
    }
};
