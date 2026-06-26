/* ==========================================================================
   APP.JS — MONT°6 LUXURY EDITION
   Premium Animations with GSAP + ScrollTrigger
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initGSAP();
    initScrollReveal();
    initNavbar();
    initMobileMenu();
    initLanguageSwitcher();
    initSmoothScroll();
    initFAQAccordion();
    initBookingForm();
    initLightbox();
    initFloatingCTA();
    initCookieBanner();
});

/* --------------------------------------------------------------------------
   GSAP — Cinematic Animations
   -------------------------------------------------------------------------- */
function initGSAP() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    gsap.registerPlugin(ScrollTrigger);

    // Hero Ken Burns Effect
    const heroBg = document.getElementById('hero-bg');
    if (heroBg) {
        gsap.fromTo(heroBg,
            { scale: 1.15, opacity: 0.8 },
            { scale: 1, opacity: 1, duration: 2.5, ease: 'power2.out' }
        );
    }

    // Hero Parallax on Scroll
    gsap.to('#hero-bg', {
        yPercent: 25,
        ease: 'none',
        scrollTrigger: {
            trigger: '#home',
            start: 'top top',
            end: 'bottom top',
            scrub: true
        }
    });

    // Hero Content Stagger Animation
    const heroContent = document.getElementById('hero-content');
    if (heroContent) {
        const revealElements = heroContent.querySelectorAll('.reveal-up');
        gsap.fromTo(revealElements,
            { opacity: 0, y: 60 },
            {
                opacity: 1,
                y: 0,
                duration: 1,
                stagger: 0.15,
                ease: 'power3.out',
                delay: 0.5
            }
        );
    }

    // Section Heading Animations
    gsap.utils.toArray('.heading-section').forEach(heading => {
        gsap.fromTo(heading,
            { opacity: 0, y: 50 },
            {
                opacity: 1,
                y: 0,
                duration: 1,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: heading,
                    start: 'top 85%',
                    toggleActions: 'play none none reverse'
                }
            }
        );
    });

    // Parallax Sections
    gsap.utils.toArray('.parallax-section').forEach(section => {
        const overlay = section.querySelector('.parallax-overlay');
        gsap.fromTo(overlay,
            { opacity: 0.3 },
            {
                opacity: 0.5,
                scrollTrigger: {
                    trigger: section,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: true
                }
            }
        );
    });

    // Image Hover Effects
    gsap.utils.toArray('.gallery-item').forEach(item => {
        item.addEventListener('mouseenter', () => {
            gsap.to(item.querySelector('img'), {
                scale: 1.08,
                duration: 0.8,
                ease: 'power2.out'
            });
        });
        item.addEventListener('mouseleave', () => {
            gsap.to(item.querySelector('img'), {
                scale: 1,
                duration: 0.8,
                ease: 'power2.out'
            });
        });
    });

    // Review Cards Hover
    gsap.utils.toArray('.review-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            gsap.to(card, {
                y: -8,
                duration: 0.4,
                ease: 'power2.out'
            });
        });
        card.addEventListener('mouseleave', () => {
            gsap.to(card, {
                y: 0,
                duration: 0.4,
                ease: 'power2.out'
            });
        });
    });

    // Location Cards Hover
    gsap.utils.toArray('.location-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            gsap.to(card, {
                y: -6,
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
                duration: 0.4,
                ease: 'power2.out'
            });
        });
        card.addEventListener('mouseleave', () => {
            gsap.to(card, {
                y: 0,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                duration: 0.4,
                ease: 'power2.out'
            });
        });
    });
}

/* --------------------------------------------------------------------------
   SCROLL REVEAL — Intersection Observer
   -------------------------------------------------------------------------- */
function initScrollReveal() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -80px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all reveal elements
    document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right, .reveal-scale').forEach(el => {
        observer.observe(el);
    });

    // Observe sections for background animations
    document.querySelectorAll('section').forEach(section => {
        observer.observe(section);
    });
}

/* --------------------------------------------------------------------------
   NAVBAR — Scroll behavior
   -------------------------------------------------------------------------- */
function initNavbar() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.scrollY;

        if (currentScroll > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        lastScroll = currentScroll;
    }, { passive: true });
}

/* --------------------------------------------------------------------------
   MOBILE MENU
   -------------------------------------------------------------------------- */
function initMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');

    if (!btn || !menu) return;

    let isOpen = false;

    btn.addEventListener('click', () => {
        isOpen = !isOpen;
        btn.classList.toggle('active', isOpen);

        if (isOpen) {
            menu.classList.add('open');
            document.body.classList.add('overflow-hidden');
        } else {
            menu.classList.remove('open');
            document.body.classList.remove('overflow-hidden');
        }
    });

    // Close on link click
    menu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            isOpen = false;
            btn.classList.remove('active');
            menu.classList.remove('open');
            document.body.classList.remove('overflow-hidden');
        });
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen) {
            isOpen = false;
            btn.classList.remove('active');
            menu.classList.remove('open');
            document.body.classList.remove('overflow-hidden');
        }
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
        btn.classList.toggle('font-semibold', isActive);
        btn.classList.toggle('text-white', isActive);
        btn.classList.toggle('text-white/50', !isActive);
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
                const offset = 100;
                const position = target.getBoundingClientRect().top + window.scrollY - offset;

                window.scrollTo({
                    top: position,
                    behavior: 'smooth'
                });
            }
        });
    });
}

/* --------------------------------------------------------------------------
   FAQ ACCORDION
   -------------------------------------------------------------------------- */
function initFAQAccordion() {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');

        question.addEventListener('click', () => {
            const isOpen = item.classList.contains('open');

            // Close all others
            faqItems.forEach(other => {
                other.classList.remove('open');
                other.querySelector('.faq-answer').style.maxHeight = '0';
            });

            // Toggle current
            if (!isOpen) {
                item.classList.add('open');
                answer.style.maxHeight = answer.scrollHeight + 'px';
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

    // Flatpickr
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

    // WhatsApp
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
        const guests = guestSelect?.value || '2';

        const hostPhone = '393881908816';
        const message = lang === 'en'
            ? `Hi! I'd like to check availability for Mont°6.\n\n📅 Check-in: ${checkIn.trim()}\n📅 Check-out: ${checkOut.trim()}\n👥 Guests: ${guests}\n\nThank you!`
            : `Salve! Vorrei verificare la disponibilità per Mont°6.\n\n📅 Check-in: ${checkIn.trim()}\n📅 Check-out: ${checkOut.trim()}\n👥 Ospiti: ${guests}\n\nIn attesa di riscontro, grazie.`;

        window.open(`https://wa.me/${hostPhone}?text=${encodeURIComponent(message)}`, '_blank');
    });

    function updatePrice(selectedDates) {
        if (selectedDates.length !== 2) return;

        const checkIn = selectedDates[0];
        const checkOut = selectedDates[1];
        const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

        // Monthly rates (Jan-Dec)
        const rates = [90, 90, 90, 100, 135, 160, 190, 220, 140, 100, 90, 90];
        const nightlyRate = rates[checkIn.getMonth()] || 160;
        const total = nightlyRate * nights;

        if (priceNightly) priceNightly.textContent = `€${nightlyRate}`;
        if (priceTotal) priceTotal.textContent = `€${total}`;
        if (priceDisplay) {
            priceDisplay.classList.remove('hidden');
            gsap.fromTo(priceDisplay,
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
            );
        }
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

    GLightbox({
        selector: '.glightbox, .gallery-item[href]',
        touchNavigation: true,
        loop: true,
        autoplayVideos: false,
        zoomable: true,
        draggable: false,
        openEffect: 'zoom',
        closeEffect: 'fade'
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
            cta.classList.add('visible');
        } else {
            cta.classList.remove('visible');
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
        banner.classList.add('visible');
        gsap.fromTo(banner,
            { y: 50, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }
        );
    }, 1500);

    acceptBtn.addEventListener('click', () => {
        localStorage.setItem('mont6_cookie_accepted', 'true');
        gsap.to(banner, {
            y: 50,
            opacity: 0,
            duration: 0.3,
            ease: 'power2.in',
            onComplete: () => banner.classList.remove('visible')
        });
    });
}

/* --------------------------------------------------------------------------
   Image Lazy Loading Enhancement
   -------------------------------------------------------------------------- */
document.querySelectorAll('img[loading="lazy"]').forEach(img => {
    img.addEventListener('load', () => {
        gsap.fromTo(img,
            { opacity: 0, scale: 1.02 },
            { opacity: 1, scale: 1, duration: 0.6, ease: 'power2.out' }
        );
    });
});
