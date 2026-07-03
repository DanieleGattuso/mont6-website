// Sincronizza la lingua preferita salvata (usato da privacy.html e success.html).
// File esterno: consente una CSP senza 'unsafe-inline' per gli script.
(function () {
    var savedLang = 'it';
    try { savedLang = localStorage.getItem('mont6_lang') || 'it'; } catch (e) {}
    document.documentElement.setAttribute('data-lang', savedLang);
    document.documentElement.setAttribute('lang', savedLang);
})();
