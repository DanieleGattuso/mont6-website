// Lingua delle pagine secondarie (privacy, conferma pagamento).
// Ordine: ?lang= nell'URL (lo passa Stripe al ritorno dal checkout), poi italiano.
(function () {
    var q = new URLSearchParams(location.search).get('lang');
    var lang = q === 'en' || (!q && document.documentElement.getAttribute('data-lang') === 'en') ? 'en' : 'it';
    document.documentElement.setAttribute('data-lang', lang);
    document.documentElement.setAttribute('lang', lang);
})();
