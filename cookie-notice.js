// This is an essential-storage notice, not consent to tracking.
document.addEventListener('DOMContentLoaded', () => {
    const banner = document.getElementById('cookieBanner');
    const dismiss = document.getElementById('cookieAccept');
    const dialog = document.getElementById('cookiePreferences');
    if (!banner || !dismiss || !dialog) return;

    let acknowledged = false;
    try { acknowledged = localStorage.getItem('mont6_cookie_accepted') === 'true'; } catch { /* optional storage */ }
    const updateSpace = () => {
        document.documentElement.style.setProperty('--cookie-notice-height', `${banner.hidden ? 0 : banner.offsetHeight}px`);
    };
    const closeNotice = () => {
        banner.hidden = true;
        banner.classList.remove('visible');
        document.body.classList.remove('cookie-notice-open');
        updateSpace();
        try { localStorage.setItem('mont6_cookie_accepted', 'true'); } catch { /* page-only acknowledgement */ }
    };
    if (!acknowledged) {
        banner.hidden = false;
        banner.classList.add('visible');
        document.body.classList.add('cookie-notice-open');
        updateSpace();
    }
    dismiss.addEventListener('click', closeNotice);
    if ('ResizeObserver' in window) new ResizeObserver(updateSpace).observe(banner);
    window.addEventListener('resize', updateSpace);

    let opener;
    document.querySelectorAll('[data-cookie-preferences]').forEach(link => {
        link.addEventListener('click', event => {
            if (typeof dialog.showModal !== 'function') return; // ordinary privacy link fallback
            event.preventDefault();
            opener = link;
            dialog.showModal();
        });
    });
    dialog.querySelector('[data-cookie-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => opener?.focus());
});
