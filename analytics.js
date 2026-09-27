/* Basic consent: no Google code or requests before an explicit statistics opt-in. */
(() => {
    'use strict';
    const CONSENT_KEY = 'mont6_analytics_consent_v1';
    const PURCHASE_KEY = 'mont6_analytics_purchases_v1';
    const CAMPAIGN_KEY = 'mont6_analytics_campaign_v1';
    const MAX_AGE = 180 * 24 * 60 * 60 * 1000;
    const meta = document.querySelector('meta[name="mont6-analytics-id"]');
    const measurementId = (meta?.content || '').trim();
    const configured = /^G-[A-Z0-9]{6,15}$/.test(measurementId);
    const productionHost = /^(?:www\.)?mont6cefalu\.it$/.test(location.hostname);
    const allowedEvents = new Set(['page_view', 'begin_checkout', 'contact_request', 'purchase']);
    let consent = null;
    let consentUntil = 0;
    let script = null;
    let started = false;
    let expiredTimer = null;
    let campaign = {};
    let purchaseIds = new Set();

    function storageRead(store, key) {
        try { return JSON.parse(window[store].getItem(key) || 'null'); } catch { return null; }
    }
    function storageWrite(store, key, value) {
        try { window[store].setItem(key, JSON.stringify(value)); } catch { /* consent works for this page */ }
    }
    function storageRemove(store, key) {
        try { window[store].removeItem(key); } catch { /* unavailable storage is non-blocking */ }
    }
    function validConsent(record) {
        return record && ['accepted', 'rejected'].includes(record.choice)
            && Number.isFinite(record.at) && record.at <= Date.now()
            && Date.now() - record.at < MAX_AGE;
    }
    function cleanCookies() {
        let names = [];
        try { names = document.cookie.split(';').map(part => part.trim().split('=')[0]).filter(name => /^_ga(?:_|$)/.test(name)); } catch { return; }
        const domains = ['', location.hostname, '.' + location.hostname, 'mont6cefalu.it', '.mont6cefalu.it'];
        for (const name of names) {
            for (const domain of new Set(domains)) {
                try { document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? '; Domain=' + domain : ''}`; } catch { /* optional analytics cookies only */ }
            }
        }
    }
    function announce() {
        try { window.dispatchEvent(new CustomEvent('mont6:analytics-consent', { detail: { consent } })); } catch { /* not required for booking */ }
    }
    function stop() {
        if (configured) window['ga-disable-' + measurementId] = true;
        started = false;
        try { script?.remove(); } catch { /* already removed */ }
        script = null;
        // Do not send a consent update: basic consent must not emit denied-consent pings.
        if (Array.isArray(window.mont6DataLayer)) window.mont6DataLayer.length = 0;
        campaign = {};
        purchaseIds.clear();
        storageRemove('sessionStorage', CAMPAIGN_KEY);
        storageRemove('localStorage', PURCHASE_KEY);
        cleanCookies();
    }
    function scheduleExpiry() {
        clearTimeout(expiredTimer);
        if (!consentUntil) return;
        expiredTimer = setTimeout(() => {
            if (Date.now() >= consentUntil) {
                consent = null;
                consentUntil = 0;
                storageRemove('localStorage', CONSENT_KEY);
                stop();
                announce();
            } else scheduleExpiry();
        }, Math.min(Math.max(consentUntil - Date.now(), 1), 2147483647));
    }
    function getConsent() {
        if (consent && Date.now() >= consentUntil) {
            consent = null;
            consentUntil = 0;
            storageRemove('localStorage', CONSENT_KEY);
            stop();
            announce();
        }
        return consent;
    }
    function pageContext() {
        // Only known public routes; unexpected paths can contain personal data too.
        const path = /^\/(?:en\/|it\/)?(?:(?:privacy|success|404)(?:\.html)?|index\.html)?\/?$/.test(location.pathname) ? location.pathname : '/404';
        let referrer = '';
        let ignoreReferrer = false;
        try {
            const parsed = new URL(document.referrer);
            if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
                referrer = parsed.origin;
                ignoreReferrer = parsed.hostname === 'checkout.stripe.com';
            }
        } catch { /* no usable referrer */ }
        // Omit this field for every other referrer: even a false value can exclude attribution.
        return { page_location: location.origin + path, page_referrer: referrer, page_title: 'Mont°6 — Sito ufficiale', ...(ignoreReferrer ? { ignore_referrer: true } : {}) };
    }
    function cleanCampaign(source) {
        if (!source || source.campaign_name !== 'estate_2027') return {};
        const cleaned = { campaign_name: 'estate_2027' };
        if (['instagram', 'facebook', 'google', 'newsletter'].includes(source.campaign_source)) cleaned.campaign_source = source.campaign_source;
        if (['organic_social', 'cpc', 'email', 'referral'].includes(source.campaign_medium)) cleaned.campaign_medium = source.campaign_medium;
        if (['bio', 'post', 'story'].includes(source.campaign_content)) cleaned.campaign_content = source.campaign_content;
        return cleaned;
    }
    function readCampaign() {
        const search = new URLSearchParams(location.search);
        const incoming = cleanCampaign({
            campaign_name: search.get('utm_campaign'), campaign_source: search.get('utm_source'),
            campaign_medium: search.get('utm_medium'), campaign_content: search.get('utm_content')
        });
        const saved = storageRead('sessionStorage', CAMPAIGN_KEY);
        campaign = incoming.campaign_name ? incoming : cleanCampaign(saved);
        if (campaign.campaign_name) storageWrite('sessionStorage', CAMPAIGN_KEY, campaign);
    }
    function queue() {
        window.mont6DataLayer.push(arguments);
    }
    function start() {
        if (started || !configured || !productionHost || getConsent() !== 'accepted') return false;
        try {
            readCampaign();
            const saved = storageRead('localStorage', PURCHASE_KEY);
            if (saved && saved.until === consentUntil && Array.isArray(saved.ids)) {
                purchaseIds = new Set(saved.ids.filter(id => typeof id === 'string' && /^mont6_[1-9]\d*$/.test(id)).slice(-100));
            }
            window['ga-disable-' + measurementId] = false;
            window.mont6DataLayer = window.mont6DataLayer || [];
            queue('consent', 'default', {
                analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'
            });
            queue('set', { ...pageContext(), url_passthrough: false, ads_data_redaction: true, allow_google_signals: false, allow_ad_personalization_signals: false });
            queue('js', new Date());
            queue('config', measurementId, {
                ...pageContext(), ...campaign, send_page_view: false, cookie_expires: MAX_AGE / 1000, cookie_update: false,
                allow_google_signals: false, allow_ad_personalization_signals: false
            });
            script = document.createElement('script');
            script.async = true;
            script.referrerPolicy = 'origin';
            script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}&l=mont6DataLayer`;
            script.onerror = () => { stop(); };
            started = true;
            document.head.appendChild(script);
            track('page_view');
            return true;
        } catch {
            stop();
            return false;
        }
    }
    function transactionParams(input) {
        if (input.currency !== 'EUR' || typeof input.value !== 'number' || !Number.isFinite(input.value) || input.value <= 0 || input.value > 100000) return null;
        const value = Math.round(input.value * 100) / 100;
        return { value, currency: 'EUR', items: [{ item_id: 'mont6_stay', item_name: 'Soggiorno Mont6', quantity: 1, price: value }] };
    }
    function track(event, input = {}) {
        try {
            if (getConsent() !== 'accepted' || !started || !allowedEvents.has(event) || !input || typeof input !== 'object') return false;
            let params = {};
            if (event === 'contact_request') {
                if (!['whatsapp', 'email', 'phone'].includes(input.method) || !['booking', 'footer'].includes(input.placement)) return false;
                params = { method: input.method, placement: input.placement };
            }
            if (event === 'begin_checkout' || event === 'purchase') {
                params = transactionParams(input);
                if (!params) return false;
            }
            if (event === 'purchase') {
                if (typeof input.transaction_id !== 'string' || !/^mont6_[1-9]\d*$/.test(input.transaction_id) || purchaseIds.has(input.transaction_id)) return false;
                params.transaction_id = input.transaction_id;
            }
            queue('event', event, { ...params, ...pageContext(), ...campaign, send_to: measurementId });
            if (event === 'purchase') {
                purchaseIds.add(input.transaction_id);
                purchaseIds = new Set([...purchaseIds].slice(-100));
                storageWrite('localStorage', PURCHASE_KEY, { until: consentUntil, ids: [...purchaseIds] });
            }
            return true;
        } catch { return false; }
    }
    function setConsent(choice) {
        if (!['accepted', 'rejected'].includes(choice)) return false;
        const wasAccepted = getConsent() === 'accepted';
        consent = choice;
        const at = Date.now();
        consentUntil = at + MAX_AGE;
        storageWrite('localStorage', CONSENT_KEY, { choice, at });
        scheduleExpiry();
        if (choice === 'accepted') {
            // Refresh the deduplication expiry along with an explicit renewal of consent.
            if (wasAccepted && purchaseIds.size) storageWrite('localStorage', PURCHASE_KEY, { until: consentUntil, ids: [...purchaseIds] });
            start();
        } else stop();
        announce();
        return true;
    }
    window.Mont6Analytics = Object.freeze({ track, getConsent, setConsent, revoke: () => setConsent('rejected'), isConfigured: () => configured, isEnabled: () => started && getConsent() === 'accepted' });

    const initial = storageRead('localStorage', CONSENT_KEY);
    if (validConsent(initial)) {
        consent = initial.choice;
        consentUntil = initial.at + MAX_AGE;
    } else storageRemove('localStorage', CONSENT_KEY);
    if (consent === 'accepted') start();
    else stop();
    scheduleExpiry();
    window.addEventListener('storage', event => {
        if (event.key !== CONSENT_KEY && event.key !== null) return;
        const updated = storageRead('localStorage', CONSENT_KEY);
        consent = validConsent(updated) ? updated.choice : null;
        consentUntil = consent ? updated.at + MAX_AGE : 0;
        if (consent === 'accepted') start();
        else stop();
        scheduleExpiry();
        announce();
    });
    window.addEventListener('pageshow', () => { getConsent(); });
})();
