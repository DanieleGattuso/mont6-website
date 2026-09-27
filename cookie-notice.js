document.addEventListener('DOMContentLoaded', () => {
    const banner = document.getElementById('cookieBanner');
    const dialog = document.getElementById('cookiePreferences');
    const analytics = window.Mont6Analytics;
    if (!banner || !dialog || !analytics) return; // analytics is optional; booking remains available

    let opener;
    const updateSpace = () => {
        document.documentElement.style.setProperty('--cookie-notice-height', `${banner.hidden ? 0 : banner.offsetHeight}px`);
    };
    const render = () => {
        const consent = analytics.getConsent();
        banner.hidden = consent !== null;
        banner.classList.toggle('visible', !banner.hidden);
        document.body.classList.toggle('cookie-notice-open', !banner.hidden);
        dialog.querySelectorAll('[data-consent-status]').forEach(status => {
            status.hidden = status.dataset.consentStatus !== (consent || 'undecided');
        });
        dialog.querySelector('[data-cookie-revoke]').hidden = consent !== 'accepted';
        updateSpace();
    };
    const closePreferences = () => {
        if (typeof dialog.close === 'function' && dialog.open) dialog.close();
        else dialog.removeAttribute('open');
        opener?.focus();
    };
    document.querySelectorAll('[data-cookie-choice]').forEach(button => {
        button.addEventListener('click', () => {
            analytics.setConsent(button.dataset.cookieChoice);
            closePreferences();
            render();
        });
    });
    document.querySelectorAll('[data-cookie-preferences]').forEach(link => {
        link.addEventListener('click', event => {
            event.preventDefault();
            opener = link;
            render();
            if (typeof dialog.showModal === 'function') {
                if (!dialog.open) dialog.showModal();
            } else {
                dialog.setAttribute('open', '');
                dialog.querySelector('[data-cookie-close]')?.focus();
            }
        });
    });
    dialog.querySelector('[data-cookie-close]').addEventListener('click', closePreferences);
    dialog.querySelector('[data-cookie-revoke]').addEventListener('click', () => {
        analytics.revoke();
        closePreferences();
        render();
    });
    dialog.addEventListener('close', () => opener?.focus());
    window.addEventListener('mont6:analytics-consent', render);
    if ('ResizeObserver' in window) new ResizeObserver(updateSpace).observe(banner);
    window.addEventListener('resize', updateSpace);
    render();
});
