/* ==========================================================================
   APP.JS — MONT°6 (Simplified, Robust)
   Vanilla JS + Flatpickr + GLightbox + GSAP
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initMobileMenu();
    initLanguageSwitcher();
    initSmoothScroll();
    initFAQAccordion();
    initBookingForm();
    initLightbox();
    initFloatingCTA();
    initCookieBanner();
    initScrollAnimations();
});

/* --------------------------------------------------------------------------
   NAVBAR — Scroll behavior
   -------------------------------------------------------------------------- */
function initNavbar() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    const updateNavbar = () => {
        if (window.scrollY > 100) {
            navbar.classList.add('bg-charcoal/95', 'backdrop-blur-sm', 'shadow-lg');
            navbar.classList.remove('bg-transparent');
        } else {
            navbar.classList.remove('bg-charcoal/95', 'backdrop-blur-sm', 'shadow-lg');
            navbar.classList.add('bg-transparent');
        }
    };

    window.addEventListener('scroll', updateNavbar, { passive: true });
    updateNavbar();
}

/* --------------------------------------------------------------------------
   MOBILE MENU
   -------------------------------------------------------------------------- */
function initMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');
    if (!btn || !menu) return;

    const ham1 = document.getElementById('ham-1');
    const ham2 = document.getElementById('ham-2');
    const ham3 = document.getElementById('ham-3');

    btn.addEventListener('click', () => {
        const isOpen = menu.classList.contains('open');

        if (isOpen) {
            menu.classList.add('hidden');
            menu.classList.remove('flex');
            menu.classList.remove('open');
            document.body.classList.remove('overflow-hidden');
            // Reset hamburger
            ham1.style.transform = '';
            ham2.style.opacity = '1';
            ham3.style.transform = '';
        } else {
            menu.classList.remove('hidden');
            menu.classList.add('flex', 'open');
            document.body.classList.add('overflow-hidden');
            // X animation
            ham1.style.transform = 'rotate(45deg) translate(5px, 5px)';
            ham2.style.opacity = '0';
            ham3.style.transform = 'rotate(-45deg) translate(5px, -5px)';
        }
    });

    // Close on link click
    menu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            menu.classList.add('hidden');
            menu.classList.remove('flex', 'open');
            document.body.classList.remove('overflow-hidden');
            ham1.style.transform = '';
            ham2.style.opacity = '1';
            ham3.style.transform = '';
        });
    });
}

/* --------------------------------------------------------------------------
   LANGUAGE SWITCHER
   -------------------------------------------------------------------------- */
function initLanguageSwitcher() {
    const savedLang = localStorage.getItem('mont6_lang') || 'it';
    setLanguage(savedLang);
}

window.setLanguage = function(lang) {
    localStorage.setItem('mont6_lang', lang);
    document.documentElement.setAttribute('data-lang', lang);

    // Show/hide language content
    document.querySelectorAll('.lang-it, .lang-en').forEach(el => {
        el.style.display = el.classList.contains(`lang-${lang}`) ? '' : 'none';
    });

    // Update button styles
    document.querySelectorAll('.lang-btn').forEach(btn => {
        const isActive = btn.textContent.toLowerCase().trim() === lang;
        btn.classList.toggle('text-white', isActive);
        btn.classList.toggle('font-semibold', isActive);
        btn.classList.toggle('text-white/60', !isActive);
    });
};

/* --------------------------------------------------------------------------
   SMOOTH SCROLL
   -------------------------------------------------------------------------- */
function initSmoothScroll() {
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
   FAQ ACCORDION
   -------------------------------------------------------------------------- */
function initFAQAccordion() {
    document.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.closest('.faq-item');
            const answer = item.querySelector('.faq-answer');
            const icon = item.querySelector('.faq-icon');
            const isOpen = !answer.classList.contains('hidden');

            // Close all others
            document.querySelectorAll('.faq-item').forEach(other => {
                other.querySelector('.faq-answer')?.classList.add('hidden');
                other.querySelector('.faq-icon').textContent = '+';
                other.querySelector('.faq-icon').style.transform = '';
            });

            // Toggle current
            if (!isOpen) {
                answer.classList.remove('hidden');
                icon.textContent = '−';
                icon.style.transform = 'rotate(180deg)';
            }
        });
    });
}

/* --------------------------------------------------------------------------
   BOOKING FORM — Flatpickr + WhatsApp
   -------------------------------------------------------------------------- */
function initBookingForm() {
    const dateInput = document.getElementById('date-range');
    const guestSelect = document.getElementById('guest-count');
    const btnWhatsApp = document.getElementById('btn-whatsapp');
    const priceDisplay = document.getElementById('price-display');
    const priceNightly = document.getElementById('price-nightly');
    const priceTotal = document.getElementById('price-total');

    if (!dateInput) return;

    // Flatpickr setup
    flatpickr(dateInput, {
        mode: 'range',
        minDate: 'today',
        dateFormat: 'd/m/Y',
        locale: 'it',
        showMonths: window.innerWidth > 768 ? 2 : 1,
        rangeSeparator: ' al ',
        onChange: function(selectedDates) {
            if (selectedDates.length === 2) {
                updatePrice(selectedDates);
            }
        }
    });

    // Guest change
    guestSelect?.addEventListener('change', () => {
        const dates = dateInput.value;
        if (dates.includes(' al ')) {
            // Re-calculate would need date parsing, for now just visual feedback
        }
    });

    // WhatsApp button
    btnWhatsApp?.addEventListener('click', () => {
        const dates = dateInput.value;
        const lang = document.documentElement.getAttribute('data-lang') || 'it';

        if (!dates || !dates.includes(' al ')) {
            alert(lang === 'en'
                ? 'Please select Check-in and Check-out dates.'
                : 'Per favore, seleziona le date di Check-in e Check-out.');
            return;
        }

        const [checkIn, checkOut] = dates.split(' al ');
        const guests = guestSelect?.value || '2';

        const hostPhone = '393881908816';
        const message = lang === 'en'
            ? `Hi! I'd like to check availability for Mont°6.\n\n📅 Check-in: ${checkIn.trim()}\n📅 Check-out: ${checkOut.trim()}\n👥 Guests: ${guests}\n\nThank you!`
            : `Salve! Vorrei verificare la disponibilità per Mont°6.\n\n📅 Check-in: ${checkIn.trim()}\n📅 Check-out: ${checkOut.trim()}\n👥 Ospiti: ${guests}\n\nIn attesa di riscontro, grazie.`;

        window.open(`https://wa.me/${hostPhone}?text=${encodeURIComponent(message)}`, '_blank');
    });

    function updatePrice(selectedDates) {
        if (!selectedDates.length === 2) return;

        const checkIn = selectedDates[0];
        const checkOut = selectedDates[1];
        const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

        // Monthly rates
        const month = checkIn.getMonth();
        const rates = [90, 90, 90, 100, 135, 160, 190, 220, 140, 100, 90, 90];
        const nightlyRate = rates[month] || 160;
        const total = nightlyRate * nights;

        if (priceNightly) priceNightly.textContent = `€${nightlyRate}`;
        if (priceTotal) priceTotal.textContent = `€${total}`;
        if (priceDisplay) priceDisplay.classList.remove('hidden');
    }
}

/* --------------------------------------------------------------------------
   LIGHTBOX — GLightbox
   -------------------------------------------------------------------------- */
function initLightbox() {
    if (typeof GLightbox === 'undefined') {
        console.warn('GLightbox not loaded');
        return;
    }

    const lightbox = GLightbox({
        selector: '.glightbox',
        touchNavigation: true,
        loop: true,
        autoplayVideos: false,
        zoomable: true,
        draggable: false
    });
}

/* --------------------------------------------------------------------------
   FLOATING CTA — Mobile
   -------------------------------------------------------------------------- */
function initFloatingCTA() {
    const cta = document.getElementById('floating-cta');
    if (!cta || window.innerWidth >= 1024) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > window.innerHeight * 0.6) {
            cta.classList.remove('-translate-y-full');
            cta.classList.add('translate-y-0');
        } else {
            cta.classList.add('-translate-y-full');
            cta.classList.remove('translate-y-0');
        }
    }, { passive: true });
}

/* --------------------------------------------------------------------------
   COOKIE BANNER
   -------------------------------------------------------------------------- */
function initCookieBanner() {
    const banner = document.getElementById('cookie-banner');
    const acceptBtn = document.getElementById('cookie-accept');

    if (!banner || !acceptBtn) return;
    if (localStorage.getItem('mont6_cookie_accepted')) return;

    setTimeout(() => {
        banner.classList.remove('translate-y-full');
        banner.classList.add('translate-y-0');
    }, 1500);

    acceptBtn.addEventListener('click', () => {
        localStorage.setItem('mont6_cookie_accepted', 'true');
        banner.classList.add('translate-y-full');
        banner.classList.remove('translate-y-0');
    });
}

/* --------------------------------------------------------------------------
   SCROLL ANIMATIONS — Intersection Observer
   -------------------------------------------------------------------------- */
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe sections
    document.querySelectorAll('section').forEach(section => {
        section.classList.add('will-animate');
        observer.observe(section);
    });

    // Observe images with fade-in
    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
        img.classList.add('will-animate');
        observer.observe(img);
    });
}

/* --------------------------------------------------------------------------
   GSAP ANIMATIONS (if loaded)
   -------------------------------------------------------------------------- */
if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);

    // Hero parallax
    gsap.to('#hero-bg', {
        yPercent: 20,
        ease: 'none',
        scrollTrigger: {
            trigger: '#home',
            start: 'top top',
            end: 'bottom top',
            scrub: true
        }
    });

    // Section titles
    gsap.utils.toArray('section h2').forEach(title => {
        gsap.from(title, {
            opacity: 0,
            y: 30,
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: {
                trigger: title,
                start: 'top 85%'
            }
        });
    });
}
