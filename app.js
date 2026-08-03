/* ==========================================================================
   APP.JS - INTERACTIVE FUNCTIONS FOR MONT°6 EDITORIAL THEME
   ========================================================================== */

/**
 * CSS non critici caricati in async: non bloccano il primo paint.
 * I percorsi sono ASSOLUTI: questo file e' condiviso fra / e /en/, un percorso
 * relativo da /en/ punterebbe a /en/vendor/... dove Cloudflare risponde con HTML.
 * (flatpickr = calendario, glightbox = galleria: servono solo all'interazione)
 */
function loadCss(href) {
    return new Promise((resolve) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = resolve;
        link.onerror = resolve;
        document.head.appendChild(link);
    });
}

// flatpickr.min.css è nel <head> (serve prima dell'init del calendario).
// glightbox serve solo all'apertura della galleria: caricato dopo il load.
window.addEventListener('load', () => {
    loadCss('/vendor/glightbox/glightbox.min.css');
});

document.addEventListener('DOMContentLoaded', () => {
    initLang();
    initNavbar();
    initScrollReveal();
    initSmoothScroll();
    initBookingForm();
    initFAQ();
    initParallax();
    initGalleryLightbox();
    initCookieBanner();
    initFloatingCTA();
    initMapLazy();
});

/**
 * Leaflet (~180KB tra JS/CSS/tile) caricato solo quando la mappa
 * si avvicina al viewport: non pesa sul caricamento iniziale.
 */
function initMapLazy() {
    const el = document.getElementById('mont6-map');
    if (!el) return;

    let started = false;
    const start = () => {
        if (started) return;
        started = true;
        Promise.all([
            loadCss('/vendor/leaflet/leaflet.css'),
            new Promise((resolve) => {
                const s = document.createElement('script');
                s.src = '/vendor/leaflet/leaflet.js';
                s.onload = resolve;
                s.onerror = resolve;
                document.head.appendChild(s);
            }),
        ]).then(() => initMap());
    };

    if (!('IntersectionObserver' in window)) { start(); return; }

    const obs = new IntersectionObserver((entries) => {
        if (entries.some(e => e.isIntersecting)) {
            obs.disconnect();
            start();
        }
    }, { rootMargin: '600px 0px' });
    obs.observe(el);
}

/**
 * Handle Bilingual logic
 */
// La lingua ora è decisa dall'URL (/ = italiano, /en/ = inglese), non più da
// un toggle JS: due pagine indicizzabili separatamente. Qui resta solo quello
// che il CSS non può fare da solo, cioè il testo delle <option>.
function initLang() {
    const lang = document.documentElement.getAttribute('data-lang') || 'it';
    document.querySelectorAll('#guest-count option').forEach(opt => {
        const label = opt.getAttribute(lang === 'en' ? 'data-en' : 'data-it');
        if (label) opt.textContent = label;
    });
}

/**
 * Handles the sticky navbar state and the FULL-SCREEN mobile menu toggle
 */
function initNavbar() {
    const navbar = document.getElementById('navbar');
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const mobileNav = document.getElementById('mobile-nav');
    const mobileLinks = document.querySelectorAll('.mobile-link');
    const body = document.body;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    }

    if (mobileBtn && mobileNav) {
        mobileBtn.addEventListener('click', () => {
            navbar.classList.toggle('nav-open');
            mobileNav.classList.toggle('open');
            
            if (mobileNav.classList.contains('open')) {
                body.style.overflow = 'hidden';
            } else {
                body.style.overflow = '';
            }
        });

        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                navbar.classList.remove('nav-open');
                mobileNav.classList.remove('open');
                body.style.overflow = '';
            });
        });
    }
}

/**
 * Intersection Observer for scroll animations
 */
function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal-up, .reveal-right, .reveal-left');

    const revealOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    };

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, revealOptions);

    reveals.forEach(reveal => {
        revealObserver.observe(reveal);
    });
}

/**
 * Smooth scrolling for internal anchor links
 */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const headerOffset = 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
  
                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                });
            }
        });
    });
}

/**
 * Price data (mirrors prezzi.json for client-side calculation)
 */
const PREZZI = {
    0: 90,   // Gennaio
    1: 90,   // Febbraio
    2: 90,   // Marzo
    3: 100,  // Aprile
    4: 135,  // Maggio
    5: 160,  // Giugno
    6: 190,  // Luglio
    7: 220,  // Agosto
    8: 140,  // Settembre
    9: 100,  // Ottobre
    10: 90,  // Novembre
    11: 90   // Dicembre
};

// Imposta di soggiorno del Comune di Cefalù: si paga all'arrivo, non passa
// da Stripe. Il tetto e' sulle notti, non sull'importo.
const TOURIST_TAX_PER_NIGHT = 2;
const TOURIST_TAX_MAX_NIGHTS = 5;

/**
 * Calculate total price for a date range
 */
function calculatePrice(startDate, endDate) {
    let total = 0;
    let nightCount = 0;
    let currentDate = new Date(startDate);
    
    while (currentDate < endDate) {
        const monthIndex = currentDate.getMonth();
        total += PREZZI[monthIndex] || 150;
        nightCount++;
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    const avgNightly = nightCount > 0 ? Math.round(total / nightCount) : 0;
    
    return { total, nightCount, avgNightly };
}

/**
 * Initialize Flatpickr calendar, dynamic pricing, and WhatsApp/Stripe booking
 */
function initBookingForm() {
    const dateInput = document.getElementById('date-range');
    const guestSelect = document.getElementById('guest-count');
    const btnRequest = document.getElementById('btn-request-whatsapp');
    const btnStripe = document.getElementById('btn-request-stripe');
    const priceBox = document.getElementById('dynamicPriceBox');
    const priceNightly = document.getElementById('priceNightly');
    const priceTotal = document.getElementById('priceTotal');

    if (!dateInput || (!btnRequest && !btnStripe)) return;

    // Il calendario segue la lingua della pagina: su /en/ mesi e separatore in inglese
    const EN_PAGE = document.documentElement.getAttribute('data-lang') === 'en';
    const SEP = EN_PAGE ? ' to ' : ' al ';

    const fp = flatpickr(dateInput, {
        mode: "range",
        minDate: "today",
        dateFormat: "d/m/Y",
        locale: EN_PAGE ? 'default' : 'it',
        showMonths: window.innerWidth > 768 ? 2 : 1,
        rangeSeparator: SEP,
        onChange: function(selectedDates) {
            // Scelto l'arrivo, il giorno in cui inizia la prenotazione successiva
            // torna selezionabile: quella mattina e' una partenza valida.
            applyDisabled(selectedDates.length === 1 ? selectedDates[0] : null);
            refreshPriceBox();
        }
    });

    /**
     * Riempie il box del prezzo con la selezione corrente.
     * Sta in una funzione sua perche' va rifatto anche quando cambia il numero
     * di ospiti, non solo quando cambiano le date: l'imposta di soggiorno
     * dipende da entrambi.
     */
    function refreshPriceBox() {
        if (!priceBox) return;
        const selezione = fp.selectedDates;
        if (selezione.length !== 2) {
            priceBox.classList.remove('visible');
            return;
        }

        const { total, nightCount, avgNightly } = calculatePrice(selezione[0], selezione[1]);
        if (nightCount <= 0) {
            priceBox.classList.remove('visible');
            return;
        }

        priceNightly.textContent = `€${avgNightly}`;
        priceTotal.textContent = `€${total}`;

        const lang = document.documentElement.getAttribute('data-lang') || 'it';
        const nightsLabel = document.getElementById('priceNights');
        if (nightsLabel) {
            nightsLabel.textContent = lang === 'en'
                ? `${nightCount} nights × average per night`
                : `${nightCount} notti × prezzo medio a notte`;
        }

        // Risparmio stimato rispetto ai portali (~15% di commissioni)
        const savings = Math.round(total * 0.15);
        ['savingsAmount', 'savingsAmountEn'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = `€${savings}`;
        });

        // Imposta di soggiorno: 2 € a persona per notte, solo per le prime 5
        // notti, da pagare all'arrivo. Non entra nel pagamento Stripe.
        const tax = TOURIST_TAX_PER_NIGHT * Math.min(nightCount, TOURIST_TAX_MAX_NIGHTS) * Number(guests());
        ['taxAmount', 'taxAmountEn'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = `€${tax}`;
        });

        priceBox.classList.add('visible');
    }

    // Cambiando il numero di ospiti cambia l'imposta: va ricalcolata
    guestSelect.addEventListener('change', refreshPriceBox);

    // Notti occupate: estremi INCLUSI (from e to sono entrambe notti gia' vendute)
    let bookedRanges = [];
    const addDays = (date, n) => {
        const d = new Date(date);
        d.setDate(d.getDate() + n);
        return d;
    };

    /**
     * Il giorno in cui inizia la prenotazione di qualcun altro e' comunque una
     * PARTENZA valida: chi e' arrivato prima esce quella mattina. Tenendolo
     * disabilitato, un buco di due notti fra due prenotazioni diventa
     * invendibile dal sito (il server invece lo accetta: booked.js usa
     * lastNight = checkOut - 1). Quindi, quando l'arrivo e' gia' scelto,
     * liberiamo il primo giorno del soggiorno successivo.
     * Le notti restanti di quel soggiorno restano disabilitate, e flatpickr
     * non consente intervalli che scavalcano giorni disabilitati.
     */
    const applyDisabled = (checkIn) => {
        const next = checkIn
            ? bookedRanges.filter(r => r.from > checkIn).sort((a, b) => a.from - b.from)[0]
            : null;
        // Confronto per data e non per oggetto: la stessa prenotazione puo'
        // arrivare due volte (la esportiamo ai portali e ci rientra), e liberarne
        // una sola lascerebbe l'altra a bloccare il giorno di partenza.
        const inizioProssimo = next ? +next.from : null;
        const list = bookedRanges
            .map(r => (inizioProssimo !== null && +r.from === inizioProssimo
                ? { from: addDays(r.from, 1), to: r.to }
                : r))
            .filter(r => r.from <= r.to);

        // Oltre la prenotazione successiva non si va: senza questo sbarramento
        // si potrebbe selezionare una partenza al di la' di essa, scavalcando
        // notti gia' vendute (flatpickr da solo lo impedisce al passaggio del
        // mouse, che sul telefono non esiste).
        if (next) list.push({ from: addDays(next.from, 1), to: new Date(2100, 0, 1) });

        fp.set('disable', list);
        fp.redraw();
    };

    // Load blocked dates from server
    const updateCalendarDisabledDates = (bookedDates) => {
        if (Array.isArray(bookedDates)) {
            bookedRanges = bookedDates
                .filter(r => r && r.from && r.to)
                .map(r => {
                    const [fY, fM, fD] = r.from.split('-');
                    const [tY, tM, tD] = r.to.split('-');
                    return { from: new Date(fY, fM - 1, fD), to: new Date(tY, tM - 1, tD) };
                });
            applyDisabled(fp.selectedDates.length === 1 ? fp.selectedDates[0] : null);
        }
    };

    fetch('/api/get-booked-dates')
        .then(response => {
            if (!response.ok) throw new Error("Serverless API non attiva");
            return response.json();
        })
        .then(data => {
            // L'API risponde { ranges, partial }; accetta anche il vecchio array
            // per non rompere nulla nei minuti del deploy.
            updateCalendarDisabledDates(Array.isArray(data) ? data : (data && data.ranges) || []);
            if (data && data.partial) {
                // Una fonte non ha risposto: il calendario potrebbe mostrare
                // libere delle date che non lo sono. Meglio dirlo.
                say('Sto ancora aggiornando la disponibilità: se le date che vuoi risultano libere, confermale su WhatsApp prima di pagare.',
                    'Availability is still syncing: if your dates look free, confirm them on WhatsApp before paying.');
            }
        })
        .catch(err => {
            console.warn("Funzione serverless non disponibile. Fallback locale:", err.message);
            fetch('/blocked-dates.json')
                .then(res => {
                    if (!res.ok) throw new Error("File locale non trovato");
                    return res.json();
                })
                .then(bookedDates => {
                    updateCalendarDisabledDates(bookedDates);
                })
                .catch(localErr => console.error("Impossibile caricare date bloccate:", localErr.message));
        });

    const isEn = () => document.documentElement.getAttribute('data-lang') === 'en';
    const guests = () => guestSelect.value;

    // Messaggi nel form invece di alert() del browser
    const formMsg = document.getElementById('form-msg');
    const say = (msgIt, msgEn) => {
        if (!formMsg) return;
        formMsg.textContent = isEn() ? msgEn : msgIt;
        formMsg.classList.add('visible');
    };

    // ponytail: una sola validazione per entrambi i CTA (era duplicata in tutti e due)
    // Ritorna [checkIn, checkOut] oppure null, spiegando il perché nel form.
    const validDates = () => {
        if (formMsg) formMsg.classList.remove('visible');

        const dates = dateInput.value;
        if (!dates || !dates.includes(SEP)) {
            say('Scegli le date di arrivo e partenza dal calendario.',
                'Pick your arrival and departure dates from the calendar.');
            dateInput.focus(); // apre il calendario
            return null;
        }

        const [checkIn, checkOut] = dates.split(SEP).map(d => d.trim());
        const toDate = (str) => { const [d, m, y] = str.split('/'); return new Date(y, m - 1, d); };
        // Notti di calendario, non ore: nel weekend del cambio d'ora un giorno
        // dura 23 o 25 ore e un soggiorno legittimo verrebbe rifiutato.
        if (Math.round((toDate(checkOut) - toDate(checkIn)) / 86400000) < 2) {
            say('Il soggiorno minimo è di 2 notti.', 'The minimum stay is 2 nights.');
            return null;
        }
        return [checkIn, checkOut];
    };

    // Se si torna indietro da Stripe, le date scelte sono ancora lì
    const SEL_KEY = 'mont6_sel';
    const localISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    try {
        const saved = JSON.parse(sessionStorage.getItem(SEL_KEY) || 'null');
        if (saved && saved.dates && saved.dates.length === 2) {
            // Prima gli ospiti, poi le date: setDate fa scattare subito il
            // ricalcolo, che deve gia' vedere il numero giusto di ospiti.
            if (saved.guests) guestSelect.value = saved.guests;
            fp.setDate(saved.dates, true, 'Y-m-d');
        }
    } catch (e) { /* selezione non ripristinabile: si riparte dal calendario vuoto */ }

    if (btnRequest) {
        btnRequest.addEventListener('click', () => {
            const range = validDates();
            if (!range) return;
            const [checkIn, checkOut] = range;

            const message = isEn()
                ? `Hi! I'd like to book Mont°6.%0A%0ACheck-in: ${checkIn}%0ACheck-out: ${checkOut}%0AGuests: ${guests()}%0A%0AThank you!`
                : `Salve! Vorrei prenotare Mont°6.%0A%0ACheck-in: ${checkIn}%0ACheck-out: ${checkOut}%0AOspiti: ${guests()}%0A%0AGrazie.`;

            window.open(`https://wa.me/393881908816?text=${message}`, '_blank', 'noopener');
        });
    }

    if (btnStripe) {
        btnStripe.addEventListener('click', async () => {
            const range = validDates();
            if (!range) return;
            const [checkIn, checkOut] = range;

            btnStripe.disabled = true;
            const originalText = btnStripe.innerHTML;
            btnStripe.innerHTML = isEn() ? 'Taking you to payment…' : 'Ti porto al pagamento…';

            try {
                sessionStorage.setItem(SEL_KEY, JSON.stringify({ dates: fp.selectedDates.map(localISO), guests: guests() }));
            } catch (e) { /* niente ripristino, il pagamento prosegue comunque */ }

            try {
                const response = await fetch('/api/create-checkout-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ checkIn, checkOut, guests: guests(), lang: isEn() ? 'en' : 'it' })
                });
                const data = await response.json().catch(() => ({}));

                if (!response.ok || !data.url) {
                    throw new Error(data.error || (isEn()
                        ? 'The payment did not start. Try again, or message me on WhatsApp.'
                        : 'Il pagamento non è partito. Riprova, oppure scrivimi su WhatsApp.'));
                }
                window.location.href = data.url;
            } catch (err) {
                say(err.message, err.message);
                btnStripe.disabled = false;
                btnStripe.innerHTML = originalText;
            }
        });
    }
}

/**
 * Handle FAQ Accordion
 */
function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const questionBtn = item.querySelector('.faq-question');
        // Stato ARIA iniziale (accessibilità)
        questionBtn.setAttribute('aria-expanded', item.classList.contains('active') ? 'true' : 'false');

        questionBtn.addEventListener('click', () => {
            const isActive = item.classList.contains('active');

            // Close all
            faqItems.forEach(faq => {
                faq.classList.remove('active');
                const btn = faq.querySelector('.faq-question');
                if (btn) btn.setAttribute('aria-expanded', 'false');
            });

            // Toggle current
            if (!isActive) {
                item.classList.add('active');
                questionBtn.setAttribute('aria-expanded', 'true');
            }
        });
    });
}

/**
 * Parallax floating effect for secondary images
 */
function initParallax() {
    const floatingElements = document.querySelectorAll('.parallax-float');
    
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        floatingElements.forEach(el => {
            const speed = 0.05;
            el.style.transform = `translateY(${scrolled * speed * -1}px)`;
        });
    });
}

/**
 * GLightbox Gallery Initialization
 */
function initGalleryLightbox() {
    if (typeof GLightbox === 'undefined') return;
    
    GLightbox({
        selector: '.glightbox-custom',
        touchNavigation: true,
        loop: true,
        autoplayVideos: false,
        openEffect: 'zoom',
        closeEffect: 'fade'
    });
}

/**
 * Cookie Banner Logic
 */
function initCookieBanner() {
    const banner = document.getElementById('cookieBanner');
    const acceptBtn = document.getElementById('cookieAccept');
    
    if (!banner || !acceptBtn) return;
    
    // Check if already accepted
    const cookieAccepted = localStorage.getItem('mont6_cookie_accepted');
    
    if (!cookieAccepted) {
        // Show banner after a short delay
        setTimeout(() => {
            banner.classList.add('visible');
        }, 1500);
    }
    
    acceptBtn.addEventListener('click', () => {
        localStorage.setItem('mont6_cookie_accepted', 'true');
        banner.classList.remove('visible');
    });
}

/**
 * Floating CTA on Mobile — show after scrolling past hero
 */
/**
 * Barra "Prenota ora" fissa in basso, solo su telefono.
 * Sparisce quando si arriva alla sezione prenotazione: li' i pulsanti veri ci
 * sono gia', e soprattutto la barra copriva l'ultima riga del calendario
 * rendendo NON toccabili quelle date (visto su iPhone reale).
 */
function initFloatingCTA() {
    const floatingCta = document.getElementById('floatingCta');
    const heroSection = document.getElementById('home');
    if (!floatingCta || !heroSection) return;

    const booking = document.getElementById('booking');

    const aggiorna = () => {
        if (window.innerWidth > 768) {
            floatingCta.classList.remove('visible');
            return;
        }

        const passatoHero = window.scrollY > heroSection.offsetHeight * 0.7;

        let dentroPrenotazione = false;
        if (booking) {
            const r = booking.getBoundingClientRect();
            dentroPrenotazione = r.top < window.innerHeight && r.bottom > 0;
        }

        // Col calendario aperto la barra non deve mai comparire
        const calendarioAperto = !!document.querySelector('.flatpickr-calendar.open');

        floatingCta.classList.toggle('visible', passatoHero && !dentroPrenotazione && !calendarioAperto);
    };

    window.addEventListener('scroll', aggiorna, { passive: true });
    window.addEventListener('resize', aggiorna);
    document.addEventListener('click', () => setTimeout(aggiorna, 50)); // apertura/chiusura calendario
    aggiorna();
}

/**
 * Interactive map (Leaflet + OpenStreetMap). Approximate position (historic center).
 */
function initMap() {
    const el = document.getElementById('mont6-map');
    if (!el || typeof L === 'undefined') return;

    const lang = document.documentElement.getAttribute('data-lang') || 'it';
    const t = (it, en) => (lang === 'en' ? en : it);

    const property = [38.0386, 14.0226]; // posizione approssimata, centro storico
    const map = L.map(el, { scrollWheelZoom: false, zoomControl: true }).setView(property, 16);

    // Basemap minimal ed elegante (CARTO Positron) — niente API key
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 20,
        attribution: '&copy; OpenStreetMap &copy; CARTO',
    }).addTo(map);

    // Marker brandizzato per la dimora (pin a goccia dorato con etichetta)
    const goldIcon = L.divIcon({
        className: 'mont6-marker',
        html: '<div class="mont6-pin"></div><span class="mont6-pin-label">Mont°6</span>',
        iconSize: [22, 22], iconAnchor: [11, 22], popupAnchor: [0, -24],
    });
    L.marker(property, { icon: goldIcon, zIndexOffset: 1000 }).addTo(map)
        .bindPopup(`<strong>Mont°6</strong><br>${t('Il tuo rifugio nel centro storico', 'Your retreat in the historic center')}`)
        .openPopup();

    // Punti di interesse (coordinate approssimate) con marker a pallino raffinato.
    // Icone SVG inline (stroke oro) coerenti con le card delle distanze — niente emoji.
    const poiSvg = (paths) =>
        `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#A8854C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
    const pois = [
        { c: [38.0394, 14.0227], icon: poiSvg('<path d="M3 22h18M6 22V11l6-4 6 4v11M12 7V3M10 4h4"/>'), it: 'Duomo di Cefalù', en: 'Cefalù Cathedral', dit: '2 min a piedi', den: '2 min walk' },
        { c: [38.0372, 14.0193], icon: poiSvg('<path d="M22 12a10 10 0 0 0-20 0ZM12 2v10M12 12v7a2 2 0 0 0 4 0"/>'), it: 'Spiaggia', en: 'Beach', dit: '5 min a piedi', den: '5 min walk' },
        { c: [38.0364, 14.0283], icon: poiSvg('<path d="m8 4 4.5 9L16 8l6 13H2z"/>'), it: 'Rocca di Cefalù', en: 'La Rocca', dit: '10 min a piedi', den: '10 min walk' },
        { c: [38.0388, 14.0216], icon: poiSvg('<path d="M3 22h18M5 22V10M19 22V10M9 22v-8M15 22v-8M2 10h20L12 3z"/>'), it: 'Lavatoio Medievale', en: 'Medieval Laundry', dit: '2 min a piedi', den: '2 min walk' },
        { c: [38.0431, 14.0146], icon: poiSvg('<rect x="4" y="3" width="16" height="13" rx="2"/><path d="M4 11h16M12 3v8M8 19l-2 3M16 19l2 3"/>'), it: 'Stazione FS', en: 'Train Station', dit: '10 min in auto', den: '10 min by car' },
    ];
    pois.forEach((p) => {
        const dot = L.divIcon({
            className: 'poi-marker',
            html: `<span class="poi-dot">${p.icon}</span>`,
            iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -16],
        });
        L.marker(p.c, { icon: dot }).addTo(map)
            .bindPopup(`<strong>${t(p.it, p.en)}</strong><br>${t(p.dit, p.den)}`);
    });

    // Abilita lo zoom con rotella solo dopo un click (evita di "rubare" lo scroll della pagina)
    map.on('click', () => map.scrollWheelZoom.enable());
    // Corregge il dimensionamento dopo eventuali animazioni di reveal
    setTimeout(() => map.invalidateSize(), 300);
}
