// Preserve existing Stripe return URLs while serving separate language pages.
// Query parameters (including session_id) stay intact. No payment logic here.
(function () {
    var q = new URLSearchParams(location.search).get('lang');
    var lang = document.documentElement.getAttribute('data-lang') || 'it';
    if ((q === 'it' || q === 'en') && q !== lang) {
        var page = location.pathname.replace(/^\/en\//, '/');
        if (/^\/(success|privacy)(\.html)?\/?$/.test(page)) {
            location.replace((q === 'en' ? '/en' : '') + page + location.search + location.hash);
        }
    }
})();
