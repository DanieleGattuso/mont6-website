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
});

/**
 * Handle Bilingual logic
 */
function initLang() {
    const savedLang = localStorage.getItem('mont6_lang') || 'it';
    setLang(savedLang);
}

window.setLang = function(lang) {
    // Set the attribute on HTML element so CSS can toggle visibility
    document.documentElement.setAttribute('data-lang', lang);
    localStorage.setItem('mont6_lang', lang);
    
    // Update active state of buttons
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

    // Sticky Navbar on Scroll
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Initial check in case page is refreshed halfway down
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    }

    // Mobile Menu Toggle (Fullscreen)
    if (mobileBtn && mobileNav) {
        mobileBtn.addEventListener('click', () => {
            navbar.classList.toggle('nav-open');
            mobileNav.classList.toggle('open');
            
            // Prevent scrolling on body when menu is open
            if (mobileNav.classList.contains('open')) {
                body.style.overflow = 'hidden';
            } else {
                body.style.overflow = '';
            }
        });

        // Close mobile menu when a link is clicked
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
                // Adjust for fixed navbar height
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
 * Initialize Flatpickr calendar and WhatsApp booking redirect
 */
function initBookingForm() {
    const dateInput = document.getElementById('date-range');
    const guestSelect = document.getElementById('guest-count');
    const btnRequest = document.getElementById('btn-request-whatsapp');
    const btnStripe = document.getElementById('btn-request-stripe');

    if (!dateInput || (!btnRequest && !btnStripe)) return;

    // Setup Flatpickr
    const fp = flatpickr(dateInput, {
        mode: "range",
        minDate: "today",
        dateFormat: "d/m/Y",
        locale: "it",
        showMonths: window.innerWidth > 768 ? 2 : 1,
        rangeSeparator: " al "
    });

    // Funzione ausiliaria per convertire le date del server (stringhe YYYY-MM-DD) in veri oggetti Date
    // e forzare il ridisegno del calendario Flatpickr
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

    // Carica dinamicamente le date bloccate dal server (manuali + Airbnb)
    fetch('/.netlify/functions/get-booked-dates')
        .then(response => {
            if (!response.ok) throw new Error("Serverless API non attiva");
            return response.json();
        })
        .then(bookedDates => {
            updateCalendarDisabledDates(bookedDates);
        })
        .catch(err => {
            console.warn("Funzione Netlify non disponibile in locale. Tento il caricamento diretto di blocked-dates.json:", err);
            // Fallback locale: carica direttamente il file JSON locale (funziona sui server locali standard come Live Server o http-server)
            fetch('/blocked-dates.json')
                .then(res => {
                    if (!res.ok) throw new Error("Impossibile caricare il file locale");
                    return res.json();
                })
                .then(bookedDates => {
                    updateCalendarDisabledDates(bookedDates);
                })
                .catch(localErr => console.error("Impossibile caricare le date bloccate in locale:", localErr));
        });

    // Helper per verificare il soggiorno minimo di 2 notti
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

            // Real Host Phone Number
            const hostPhone = "393881908816";

            // Pre-filled Message based on Language
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

            // Cambia lo stato del pulsante per mostrare il caricamento
            btnStripe.disabled = true;
            const originalText = btnStripe.innerHTML;
            btnStripe.innerHTML = currentLang === 'en' ? 'Redirecting...' : 'Elaborazione...';

            try {
                // Chiama la Serverless Function su Netlify
                const response = await fetch('/.netlify/functions/create-checkout-session', {
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
                    // Reindirizza l'utente a Stripe Checkout
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
            // Move up slightly faster than scroll
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

    // Attiva la classe per nascondere il cursore nativo solo se la funzione è attiva
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
        // Cursor moves instantly
        cursorX += (mouseX - cursorX) * 0.5;
        cursorY += (mouseY - cursorY) * 0.5;
        
        // Follower has lerp delay
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
            
            // Move button slightly
            magnet.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
            magnet.style.transition = 'transform 0.1s ease-out';
        });

        magnet.addEventListener('mouseleave', function() {
            magnet.style.transform = `translate(0px, 0px)`;
            magnet.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        });
    });
}
