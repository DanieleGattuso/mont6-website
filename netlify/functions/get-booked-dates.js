const fs = require('fs');
const path = require('path');

exports.handler = async (event) => {
    // Rispondi alle chiamate OPTIONS per CORS (necessario per sviluppo locale)
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, OPTIONS'
            },
            body: ''
        };
    }

    let bookedDates = [];

    // 1. Carica le date bloccate manualmente dal file local blocked-dates.json
    try {
        const filePath = path.join(process.cwd(), 'blocked-dates.json');
        if (fs.existsSync(filePath)) {
            const fileData = fs.readFileSync(filePath, 'utf8');
            bookedDates = JSON.parse(fileData);
        }
    } catch (e) {
        console.error("Errore nella lettura di blocked-dates.json:", e);
    }

    // 2. Carica ed effettua il parsing del calendario Airbnb se la variabile d'ambiente è impostata
    const icalUrl = process.env.AIRBNB_ICAL_URL;

    if (icalUrl) {
        try {
            // Node 18+ supporta fetch nativamente
            const response = await fetch(icalUrl);
            if (response.ok) {
                const icsText = await response.text();
                
                // Dividi il file in singoli eventi (prenotazioni)
                const events = icsText.split('BEGIN:VEVENT');
                
                for (let i = 1; i < events.length; i++) {
                    const event = events[i];
                    
                    // Regex robusta per catturare la data di inizio e fine in qualsiasi formato (data semplice o data-ora)
                    const startMatch = event.match(/DTSTART.*?:.*?(\d{8})/);
                    const endMatch = event.match(/DTEND.*?:.*?(\d{8})/);
                    
                    if (startMatch && endMatch) {
                        const startStr = startMatch[1]; // Formato "YYYYMMDD"
                        const endStr = endMatch[1];     // Formato "YYYYMMDD"
                        
                        // Converti in formato Flatpickr "YYYY-MM-DD"
                        const from = `${startStr.slice(0, 4)}-${startStr.slice(4, 6)}-${startStr.slice(6, 8)}`;
                        const to = `${endStr.slice(0, 4)}-${endStr.slice(4, 6)}-${endStr.slice(6, 8)}`;
                        
                        bookedDates.push({ from, to });
                    }
                }
            } else {
                console.error(`Errore nel caricamento del calendario Airbnb. Status: ${response.status}`);
            }
        } catch (err) {
            console.error("Errore durante il recupero del calendario Airbnb:", err);
        }
    }

    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookedDates)
    };
};
