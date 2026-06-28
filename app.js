/* ==========================================================================
   APP.JS - INTERACTIVE FUNCTIONS FOR MONT°6 EDITORIAL THEME
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initLang();
    initNavbar();
    initScrollReveal();
    initSmoothScroll();
    initBookingForm();
    initFAQ();
    initParallax();
    initCustomCursor();
    initMagneticButtons();
    initGalleryLightbox();
    initCookieBanner();
    initFloatingCTA();
    initMap();
});

/**
 * Handle Bilingual logic
 */
function initLang() {
    const savedLang = localStorage.getItem('mont6_lang') || 'it';
    setLang(savedLang);
}

window.setLang = function(lang) {
    document.documentElement.setAttribute('data-lang', lang);
    localStorage.setItem('mont6_lang', lang);
    
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
        if(btn.textContent.toLowerCase() === lang) {
            btn.classList.add('active');
        }
    });
};

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

    // Setup Flatpickr
    const fp = flatpickr(dateInput, {
        mode: "range",
        minDate: "today",
        dateFormat: "d/m/Y",
        locale: "it",
        showMonths: window.innerWidth > 768 ? 2 : 1,
        rangeSeparator: " al ",
        onChange: function(selectedDates) {
            // Dynamic price calculation when both dates are selected
            if (selectedDates.length === 2 && priceBox) {
                const start = selectedDates[0];
                const end = selectedDates[1];
                const { total, nightCount, avgNightly } = calculatePrice(start, end);
                
                if (nightCount > 0) {
                    priceNightly.textContent = `€${avgNightly}`;
                    priceTotal.textContent = `€${total}`;
                    priceBox.classList.add('visible');
                }
            } else if (priceBox) {
                priceBox.classList.remove('visible');
            }
        }
    });

    // Load blocked dates from server
    const updateCalendarDisabledDates = (bookedDates) => {
        if (Array.isArray(bookedDates)) {
            const formattedDates = bookedDates.map(range => {
                if (range.from && range.to) {
                    const [fY, fM, fD] = range.from.split('-');
                    const [tY, tM, tD] = range.to.split('-');
                    return {
                        from: new Date(fY, fM - 1, fD),
                        to: new Date(tY, tM - 1, tD)
                    };
                }
                return range;
            });
            fp.set('disable', formattedDates);
            fp.redraw();
        }
    };

    fetch('/api/get-booked-dates')
        .then(response => {
            if (!response.ok) throw new Error("Serverless API non attiva");
            return response.json();
        })
        .then(bookedDates => {
            updateCalendarDisabledDates(bookedDates);
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

    // Min stay validation helper
    const checkMinStay = (checkInStr, checkOutStr, currentLang) => {
        const parseDate = (dStr) => {
            const [d, m, y] = dStr.trim().split('/');
            return new Date(y, m - 1, d);
        };
        const start = parseDate(checkInStr);
        const end = parseDate(checkOutStr);
        const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        
        if (nights < 2) {
            const minStayMsg = currentLang === 'en' 
                ? "Minimum stay is 2 nights." 
                : "Il soggiorno minimo è di 2 notti.";
            alert(minStayMsg);
            return false;
        }
        return true;
    };

    // Handle WhatsApp Submission
    if (btnRequest) {
        btnRequest.addEventListener('click', () => {
            const dates = dateInput.value;
            const guestVal = guestSelect.options[guestSelect.selectedIndex].value;
            const currentLang = document.documentElement.getAttribute('data-lang') || 'it';
            
            if (!dates || !dates.includes(' al ')) {
                const errorMsg = currentLang === 'en' 
                    ? "Please select a Check-in and Check-out date from the calendar." 
                    : "Per favore, seleziona una data di Check-in e una di Check-out dal calendario.";
                alert(errorMsg);
                return;
            }

            const [checkIn, checkOut] = dates.split(' al ');

            if (!checkMinStay(checkIn, checkOut, currentLang)) {
                return;
            }

            const hostPhone = "393881908816";

            let message = '';
            if (currentLang === 'en') {
                message = `Hi! I'd like to check availability for Mont°6.%0A%0A🗓 Check-in: ${checkIn.trim()}%0A🗓 Check-out: ${checkOut.trim()}%0A👥 Guests: ${guestVal}%0A%0AThank you!`;
            } else {
                message = `Salve! Vorrei verificare la disponibilità per soggiornare a Mont°6.%0A%0A🗓 Check-in: ${checkIn.trim()}%0A🗓 Check-out: ${checkOut.trim()}%0A👥 Ospiti: ${guestVal}%0A%0AIn attesa di riscontro, grazie.`;
            }
            
            const whatsappUrl = `https://wa.me/${hostPhone}?text=${message}`;
            window.open(whatsappUrl, '_blank');
        });
    }

    // Handle Stripe Submission
    if (btnStripe) {
        btnStripe.addEventListener('click', async () => {
            const dates = dateInput.value;
            const guestVal = guestSelect.options[guestSelect.selectedIndex].value;
            const currentLang = document.documentElement.getAttribute('data-lang') || 'it';
            
            if (!dates || !dates.includes(' al ')) {
                const errorMsg = currentLang === 'en' 
                    ? "Please select a Check-in and Check-out date from the calendar." 
                    : "Per favore, seleziona una data di Check-in e una di Check-out dal calendario.";
                alert(errorMsg);
                return;
            }

            const [checkIn, checkOut] = dates.split(' al ');

            if (!checkMinStay(checkIn, checkOut, currentLang)) {
                return;
            }

            btnStripe.disabled = true;
            const originalText = btnStripe.innerHTML;
            btnStripe.innerHTML = currentLang === 'en' ? 'Redirecting...' : 'Elaborazione...';

            try {
                const response = await fetch('/api/create-checkout-session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        checkIn: checkIn.trim(),
                        checkOut: checkOut.trim(),
                        guests: guestVal
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || (currentLang === 'en' ? 'Server error' : 'Errore del server'));
                }

                const data = await response.json();
                
                if (data.url) {
                    window.location.href = data.url;
                } else {
                    throw new Error(currentLang === 'en' ? 'Unable to create checkout session' : 'Impossibile avviare la sessione di pagamento.');
                }
            } catch (err) {
                alert(err.message);
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
        questionBtn.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // Close all
            faqItems.forEach(faq => faq.classList.remove('active'));
            
            // Toggle current
            if (!isActive) {
                item.classList.add('active');
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
 * Custom Cursor (Pure JS, lightweight requestAnimationFrame)
 */
function initCustomCursor() {
    if (window.innerWidth <= 1024) return;

    const cursor = document.querySelector('.custom-cursor');
    const follower = document.querySelector('.custom-cursor-follower');
    if (!cursor || !follower) return;

    document.body.classList.add('custom-cursor-active');

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let cursorX = mouseX;
    let cursorY = mouseY;
    let followerX = mouseX;
    let followerY = mouseY;

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function render() {
        cursorX += (mouseX - cursorX) * 0.5;
        cursorY += (mouseY - cursorY) * 0.5;
        
        followerX += (mouseX - followerX) * 0.15;
        followerY += (mouseY - followerY) * 0.15;

        cursor.style.left = `${cursorX}px`;
        cursor.style.top = `${cursorY}px`;
        follower.style.left = `${followerX}px`;
        follower.style.top = `${followerY}px`;

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

    // Hover states
    const hoverElements = document.querySelectorAll('a, button, .luxe-input, .lang-btn, .am-elegant-item');
    hoverElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursor.classList.add('hover');
            follower.classList.add('hover');
        });
        el.addEventListener('mouseleave', () => {
            cursor.classList.remove('hover');
            follower.classList.remove('hover');
        });
    });
}

/**
 * Magnetic Buttons Logic (Pure JS)
 */
function initMagneticButtons() {
    if (window.innerWidth <= 1024) return;

    const magnets = document.querySelectorAll('.btn-luxe');
    
    magnets.forEach(magnet => {
        magnet.addEventListener('mousemove', function(e) {
            const position = magnet.getBoundingClientRect();
            const x = e.clientX - position.left - position.width / 2;
            const y = e.clientY - position.top - position.height / 2;
            
            magnet.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
            magnet.style.transition = 'transform 0.1s ease-out';
        });

        magnet.addEventListener('mouseleave', function() {
            magnet.style.transform = `translate(0px, 0px)`;
            magnet.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
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
        closeEffect: 'fade',
        cssEf498: 'fade'
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
function initFloatingCTA() {
    const floatingCta = document.getElementById('floatingCta');
    if (!floatingCta) return;
    
    const heroSection = document.getElementById('home');
    if (!heroSection) return;
    
    const heroHeight = heroSection.offsetHeight;
    
    window.addEventListener('scroll', () => {
        if (window.innerWidth > 768) return; // Only on mobile
        
        if (window.scrollY > heroHeight * 0.7) {
            floatingCta.classList.add('visible');
        } else {
            floatingCta.classList.remove('visible');
        }
    });
}

/**
 * Interactive map (Leaflet + OpenStreetMap). Approximate position (historic center).
 */
function initMap() {
    const el = document.getElementById('mont6-map');
    if (!el || typeof L === 'undefined') return;

    const lang = document.documentElement.getAttribute('data-lang') || 'it';
    const t = (it, en) => (lang === 'en' ? en : it);

    // Icone di default servite dal CDN (altrimenti i marker non comparirebbero)
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const property = [38.0386, 14.0226]; // posizione approssimata, centro storico
    const map = L.map(el, { scrollWheelZoom: false }).setView(property, 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    // Marker brandizzato per la dimora
    const goldIcon = L.divIcon({
        className: '', html: '<div class="mont6-pin"></div>',
        iconSize: [18, 18], iconAnchor: [9, 18], popupAnchor: [0, -18],
    });
    L.marker(property, { icon: goldIcon }).addTo(map)
        .bindPopup(`<strong>Mont°6</strong><br>${t('Il tuo rifugio nel centro storico', 'Your retreat in the historic center')}`)
        .openPopup();

    // Punti di interesse (coordinate approssimate)
    const pois = [
        { c: [38.0394, 14.0227], it: 'Duomo di Cefalù', en: 'Cefalù Cathedral', dit: '2 min a piedi', den: '2 min walk' },
        { c: [38.0372, 14.0193], it: 'Spiaggia', en: 'Beach', dit: '5 min a piedi', den: '5 min walk' },
        { c: [38.0364, 14.0283], it: 'Rocca di Cefalù', en: 'La Rocca', dit: '10 min a piedi', den: '10 min walk' },
        { c: [38.0388, 14.0216], it: 'Lavatoio Medievale', en: 'Medieval Laundry', dit: '2 min a piedi', den: '2 min walk' },
        { c: [38.0431, 14.0146], it: 'Stazione FS', en: 'Train Station', dit: '10 min in auto', den: '10 min by car' },
    ];
    pois.forEach((p) => {
        L.marker(p.c).addTo(map)
            .bindPopup(`<strong>${t(p.it, p.en)}</strong><br>${t(p.dit, p.den)}`);
    });

    // Abilita lo zoom con rotella solo dopo un click (evita di "rubare" lo scroll della pagina)
    map.on('click', () => map.scrollWheelZoom.enable());
    // Corregge il dimensionamento dopo eventuali animazioni di reveal
    setTimeout(() => map.invalidateSize(), 300);
}
