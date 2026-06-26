/* ==========================================================================
   APP.JS — MONT°6 EDITORIAL THEME (Phase 1)
   Alpine.js + GSAP Animations + Tailwind Integration
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initLang();
    initScrollReveal();
    initGSAPHero();
    initGSAPScrollTrigger();
    initCustomCursor();
    initGalleryLightbox();
    initBookingForm();
    initNavbar();
    initFloatingCTA();
    initCookieBanner();
});

/* --------------------------------------------------------------------------
   LANGUAGE SWITCHER
   -------------------------------------------------------------------------- */
function initLang() {
    const savedLang = localStorage.getItem('mont6_lang') || 'it';
    setLang(savedLang);
}

window.setLang = function(lang) {
    document.documentElement.setAttribute('data-lang', lang);
    localStorage.setItem('mont6_lang', lang);

    // Update Alpine.js lang buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        const isActive = btn.textContent.toLowerCase().trim() === lang;
        btn.classList.toggle('font-semibold', isActive);
        btn.classList.toggle('text-white', isActive);
        btn.classList.toggle('text-white/60', !isActive);
    });
};

/* --------------------------------------------------------------------------
   SCROLL REVEAL (Intersection Observer — Tailwind compatible)
   -------------------------------------------------------------------------- */
function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal-up, .reveal-right, .reveal-scale');

    const observerOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    };

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    reveals.forEach(reveal => revealObserver.observe(reveal));
}

/* --------------------------------------------------------------------------
   GSAP HERO ANIMATION (Cinematic Entrance)
   -------------------------------------------------------------------------- */
function initGSAPHero() {
    if (typeof gsap === 'undefined') return;

    // Register ScrollTrigger
    gsap.registerPlugin(ScrollTrigger);

    const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    // 1. Background Ken Burns effect
    heroTl.from('#hero-bg', {
        scale: 1.15,
        duration: 2,
        ease: 'power2.out'
    }, 0);

    // 2. Overlay fade in
    heroTl.from('.hero-overlay', {
        opacity: 0,
        duration: 1.5
    }, 0);

    // 3. Kicker
    heroTl.to('#hero-kicker', {
        opacity: 1,
        duration: 0.8,
        delay: 0.3
    }, 0);

    // 4. Title
    heroTl.from('#hero-title', {
        opacity: 0,
        y: 60,
        duration: 1
    }, 0.4);

    // 5. Meta badges with stagger
    heroTl.to('#hero-meta', {
        opacity: 1,
        duration: 0.6
    }, 0.8);

    // 6. CTA button
    heroTl.to('#hero-cta', {
        opacity: 1,
        y: 0,
        duration: 0.8
    }, 1);

    // 7. Bottom bar
    heroTl.to('#hero-bottom', {
        opacity: 1,
        duration: 0.6
    }, 1.2);

    // Parallax on scroll
    gsap.to('#hero-bg', {
        yPercent: 30,
        ease: 'none',
        scrollTrigger: {
            trigger: '#home',
            start: 'top top',
            end: 'bottom top',
            scrub: true
        }
    });
}

/* --------------------------------------------------------------------------
   GSAP SCROLL TRIGGER (Section Animations)
   -------------------------------------------------------------------------- */
function initGSAPScrollTrigger() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    // Animate sections on scroll
    document.querySelectorAll('.section').forEach(section => {
        const items = section.querySelectorAll('.reveal-up, .reveal-right, .reveal-scale');

        if (items.length === 0) return;

        gsap.from(items, {
            opacity: 0,
            y: 40,
            stagger: 0.15,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: section,
                start: 'top 80%',
                toggleActions: 'play none none reverse'
            }
        });
    });

    // Parallax images
    document.querySelectorAll('.parallax-break').forEach(el => {
        gsap.to(el, {
            backgroundPosition: '50% 100%',
            ease: 'none',
            scrollTrigger: {
                trigger: el,
                start: 'top bottom',
                end: 'bottom top',
                scrub: true
            }
        });
    });

    // Review cards stagger
    const reviewsGrid = document.querySelector('.reviews-dark .grid');
    if (reviewsGrid) {
        gsap.from(reviewsGrid.children, {
            opacity: 0,
            y: 50,
            stagger: 0.2,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: reviewsGrid,
                start: 'top 80%',
                toggleActions: 'play none none reverse'
            }
        });
    }
}

/* --------------------------------------------------------------------------
   CUSTOM CURSOR (Desktop Only)
   -------------------------------------------------------------------------- */
function initCustomCursor() {
    if (window.innerWidth < 1024) return;

    const dot = document.getElementById('cursor-dot');
    const ring = document.getElementById('cursor-ring');
    if (!dot || !ring) return;

    document.body.classList.add('custom-cursor-active');

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let dotX = mouseX;
    let dotY = mouseY;
    let ringX = mouseX;
    let ringY = mouseY;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function animateCursor() {
        // Dot follows immediately
        dotX += (mouseX - dotX) * 0.5;
        dotY += (mouseY - dotY) * 0.5;
        dot.style.left = `${dotX}px`;
        dot.style.top = `${dotY}px`;

        // Ring follows with lag
        ringX += (mouseX - ringX) * 0.15;
        ringY += (mouseY - ringY) * 0.15;
        ring.style.left = `${ringX}px`;
        ring.style.top = `${ringY}px`;

        requestAnimationFrame(animateCursor);
    }
    requestAnimationFrame(animateCursor);

    // Hover states
    const hoverTargets = 'a, button, input, select, [role="button"]';
    document.querySelectorAll(hoverTargets).forEach(el => {
        el.addEventListener('mouseenter', () => ring.classList.add('is-hovering'));
        el.addEventListener('mouseleave', () => ring.classList.remove('is-hovering'));
    });
}

/* --------------------------------------------------------------------------
   GALLERY LIGHTBOX
   -------------------------------------------------------------------------- */
function initGalleryLightbox() {
    if (typeof GLightbox === 'undefined') return;

    GLightbox({
        selector: '.glightbox-custom',
        touchNavigation: true,
        loop: true,
        autoplayVideos: false,
        openEffect: 'zoom',
        closeEffect: 'fade',
        cssEfects: { fade: { in: 'fadeIn', out: 'fadeOut' } }
    });
}

/* --------------------------------------------------------------------------
   BOOKING FORM
   -------------------------------------------------------------------------- */
function bookingForm() {
    return {
        priceNightly: 160,
        priceTotal: 0,
        nights: 0,
        checkIn: null,
        checkOut: null,
        guestCount: 2,

        updatePrice() {
            if (this.checkIn && this.checkOut) {
                const nights = Math.ceil((this.checkOut - this.checkIn) / (1000 * 60 * 60 * 24));
                this.nights = nights;
                this.priceNightly = this.getMonthlyRate(this.checkIn);
                this.priceTotal = this.priceNightly * nights;
            }
        },

        getMonthlyRate(date) {
            const month = date.getMonth();
            const rates = [90, 90, 90, 100, 135, 160, 190, 220, 140, 100, 90, 90];
            return rates[month] || 160;
        }
    };
}

function initBookingForm() {
    const dateInput = document.getElementById('date-range');
    const guestSelect = document.getElementById('guest-count');
    const btnWhatsApp = document.getElementById('btn-request-whatsapp');
    const btnStripe = document.getElementById('btn-request-stripe');

    if (!dateInput) return;

    // Flatpickr setup
    const fp = flatpickr(dateInput, {
        mode: 'range',
        minDate: 'today',
        dateFormat: 'd/m/Y',
        locale: 'it',
        showMonths: window.innerWidth > 768 ? 2 : 1,
        rangeSeparator: ' al ',
        onChange: function(selectedDates) {
            if (selectedDates.length === 2) {
                // Dispatch custom event for Alpine.js
                dateInput.dispatchEvent(new CustomEvent('dates-selected', {
                    detail: selectedDates
                }));
            }
        }
    });

    // Load blocked dates
    const updateDisabledDates = (bookedDates) => {
        if (Array.isArray(bookedDates)) {
            const formatted = bookedDates.map(range => {
                if (range.from && range.to) {
                    return {
                        from: new Date(range.from),
                        to: new Date(range.to)
                    };
                }
                return range;
            });
            fp.set('disable', formatted);
            fp.redraw();
        }
    };

    // Try Netlify function first, fallback to local JSON
    fetch('/.netlify/functions/get-booked-dates')
        .then(res => {
            if (!res.ok) throw new Error('Function not available');
            return res.json();
        })
        .then(updateDisabledDates)
        .catch(() => {
            fetch('/blocked-dates.json')
                .then(res => res.json())
                .then(updateDisabledDates)
                .catch(console.warn);
        });

    // WhatsApp button
    if (btnWhatsApp) {
        btnWhatsApp.addEventListener('click', () => {
            const dates = dateInput.value;
            const lang = document.documentElement.getAttribute('data-lang') || 'it';

            if (!dates || !dates.includes(' al ')) {
                alert(lang === 'en'
                    ? 'Please select Check-in and Check-out dates.'
                    : 'Per favore, seleziona le date di Check-in e Check-out.');
                return;
            }

            const [checkIn, checkOut] = dates.split(' al ');
            const guests = guestSelect.value;

            const hostPhone = '393881908816';
            const message = lang === 'en'
                ? `Hi! I'd like to check availability for Mont°6.\n\n📅 Check-in: ${checkIn.trim()}\n📅 Check-out: ${checkOut.trim()}\n👥 Guests: ${guests}\n\nThank you!`
                : `Salve! Vorrei verificare la disponibilità per Mont°6.\n\n📅 Check-in: ${checkIn.trim()}\n📅 Check-out: ${checkOut.trim()}\n👥 Ospiti: ${guests}\n\nIn attesa di riscontro, grazie.`;

            window.open(`https://wa.me/${hostPhone}?text=${encodeURIComponent(message)}`, '_blank');
        });
    }

    // Stripe button
    if (btnStripe) {
        btnStripe.addEventListener('click', async () => {
            const dates = dateInput.value;
            const lang = document.documentElement.getAttribute('data-lang') || 'it';

            if (!dates || !dates.includes(' al ')) {
                alert(lang === 'en'
                    ? 'Please select Check-in and Check-out dates.'
                    : 'Per favore, seleziona le date di Check-in e Check-out.');
                return;
            }

            btnStripe.disabled = true;
            const originalText = btnStripe.innerHTML;
            btnStripe.innerHTML = lang === 'en' ? 'Redirecting...' : 'Reindirizzamento...';

            try {
                const response = await fetch('/.netlify/functions/create-checkout-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ dates: dateInput.value, guests: guestSelect.value })
                });

                if (!response.ok) throw new Error('Server error');
                const data = await response.json();

                if (data.url) {
                    window.location.href = data.url;
                } else {
                    throw new Error('No checkout URL');
                }
            } catch (err) {
                alert(err.message);
                btnStripe.disabled = false;
                btnStripe.innerHTML = originalText;
            }
        });
    }
}

/* --------------------------------------------------------------------------
   NAVBAR (Scroll behavior + Mobile menu)
   -------------------------------------------------------------------------- */
function initNavbar() {
    const navbar = document.getElementById('navbar');
    const floatingCta = document.getElementById('floatingCta');

    window.addEventListener('scroll', () => {
        const scrolled = window.scrollY > 50;
        navbar?.classList.toggle('scrolled', scrolled);
    });

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const offset = 80;
                const position = target.getBoundingClientRect().top + window.scrollY - offset;
                window.scrollTo({ top: position, behavior: 'smooth' });
            }
        });
    });
}

/* --------------------------------------------------------------------------
   FLOATING CTA (Mobile)
   -------------------------------------------------------------------------- */
function initFloatingCTA() {
    const cta = document.getElementById('floatingCta');
    if (!cta || window.innerWidth >= 1024) return;

    window.addEventListener('scroll', () => {
        const heroHeight = window.innerHeight;
        cta.classList.toggle('is-visible', window.scrollY > heroHeight * 0.7);
    });
}

/* --------------------------------------------------------------------------
   COOKIE BANNER
   -------------------------------------------------------------------------- */
function initCookieBanner() {
    if (localStorage.getItem('mont6_cookie_accepted')) return;

    const banner = document.querySelector('.cookie-banner');
    if (banner) {
        setTimeout(() => {
            banner.classList.add('is-visible');
        }, 1500);
    }
}

/* --------------------------------------------------------------------------
   MOBILE MENU (Alpine.js handles the toggle, this handles body scroll)
   -------------------------------------------------------------------------- */
document.body.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const mobileMenu = document.querySelector('.mobile-menu');
        if (mobileMenu?.classList.contains('is-open')) {
            document.body.classList.remove('overflow-hidden');
            mobileMenu.classList.remove('is-open');
        }
    }
});
