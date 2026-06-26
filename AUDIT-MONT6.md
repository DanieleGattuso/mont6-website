# MONT°6 — AUDIT UX/UI & SECURITY + PIANO DI REFACTORING

> **Versione**: 1.0 | **Data**: 26 Giugno 2026 | **Oggetto**: mont6cefalu.it
> **Autore**: Claude (Senior UX/UI Designer + Web Security Engineer)

---

## 0. PREMESSA METODOLOGICA

Ho analizzato **tutto il codice sorgente** (index.html, style.css, app.js, privacy.html, success.html, prezzi.json, blocked-dates.json, _headers, package.json), ho fatto WebFetch del sito live, ho ispezionato la struttura delle immagini (60+ file JPG/MNG/PNG). Il sito usa un **stack a bassissima complessità**: HTML/CSS/JS statici, deployato su **Netlify**, con Stripe SDK Node.js (mai utilizzato lato frontend — il serverless è pensato ma non attivo), Flatpickr via CDN, GLightbox via CDN, Google Fonts.

Questo è un **punto di forza enorme**: non c'è framework legacy da migrare, non c'è debt accumulata. Si riparte da zero con un'architettura pulita.

---

## 1. VERDETTO GENERALE

| Aspetto | Voto | Classe |
|---|---|---|
| Design & Visual Identity | **8/10** | Boutique hotel — premium feel |
| UX / Funnel di Booking | **6/10** | Funziona ma frammentato |
| Frontend Engineering | **5/10** | Vanilla JS, nessuna architettura |
| Sicurezza | **3/10** | Critica — vedi sezione 4 |
| Performance | **6/10** | Buona base, ottimizzazioni assenti |
| Accessibilità | **4/10** | Mancano ARIA, focus styles, skip nav |

**Punteggio medio ponderato: 5.4/10** — Il design regge da solo, la sicurezza e l'architettura tecnica sono il collo di bottiglia.

---

## 2. MATRICE DI PRIORITÀ — TUTTO IL LAVORO

### 🔴 CRITICA / IMMEDIATA (Settimane 1-2)

Queste problemi sono **attivamente pericolosi** o bloccano la conversione.

#### C1 — NESSUN SECURITY HEADER (CRITICA)

**Problema**: Il sito non ha **NESSUN** header di sicurezza. Zero CSP, zero HSTS, zero X-Frame-Options. Questo significa:
- **XSS triviale**: qualsiasi script malevolo può caricarsi senza restrizioni
- **Clickjacking possibile**: un attacker può embeddare il sito in un iframe per rubare click
- **Man in the middle**: nessuna garanzia che le comunicazioni siano sempre su HTTPS
- **Data leak via referrer**: i dati delle transazioni Stripe possono finire nei log di terze parti

**Soluzione**: Ho già creato il file `_headers` per Netlify. **Devi solo caricarlo nella root del progetto.**

```bash
# Verifica che Netlify stia servendo gli headers
# Vai su Netlify Dashboard → Site Settings → Headers & Basic Auth → aggiungi:
```

**Codice già preparato** → vedi file `_headers` già creato nella directory del progetto.

---

#### C2 — CSP VIOLA LA SICUREZZA CON `unsafe-inline` (ALTA)

**Problema**: L'header CSP che ti ho preparato usa `'unsafe-inline'` per `script-src` e `style-src` per compatibilità con Google Fonts e l'attuale codice inline. Questo **annacqua drasticamente** la protezione XSS.

**Perché è necessario ora**: Il sito attuale ha centinaia di `<span class="lang-it">` inline — che richiedono inline styles. Quindi `'unsafe-inline'` è un **compromesso temporaneo**.

**Azione**: Nel refactoring con Tailwind, TUTTI gli stili inline verranno rimossi e sostituiti con classi Tailwind. A quel punto si potrà rimuovere `'unsafe-inline'` e avere una CSP **vera**.

---

#### C3 — `blocked-dates.json` ACCESSIBILE PUBBLICAMENTE (ALTA)

**Problema**: Chiunque può fare `GET https://mont6cefalu.it/blocked-dates.json` e vedere tutte le date prenotate. Questo è:
- **Fuga di informazioni commerciali** (calendario completo delle prenotazioni)
- **Potenziale abuse** (slot filling, scraping competitivo)
- **GDPR risk**: potrebbe rivelare pattern di booking degli ospiti

**Soluzione**:
1. Spostare `blocked-dates.json` in una directory protetta da `.htaccess` o in una funzione serverless
2. Chiedere a Netlify di servire il file solo tramite autenticazione o tramite funzione AWS Lambda/Netlify Functions
3. Nel frattempo: rinominarlo e metterlo in una cartella non-indexata

```nginx
# netlify.toml o _headers
/blocked-dates.json
  X-Robots-Tag: noindex, nofollow
```

**Miglior soluzione**: Rimuovere completamente il file JSON statico e usare solo la funzione Netlify `/.netlify/functions/get-booked-dates` (che già esiste nel codice ma non è attiva). Creare quella funzione per restituire solo le date DISPONIBILI (inverso logico) o con rate limiting.

---

#### C4 — RATE LIMITING ASSENTE SUL BOOKING (ALTA)

**Problema**: Il bottone WhatsApp e Stripe possono essere spam-clamati con un bot. Non c'è protezione contro:
- Richieste di prenotazione automatiche
- scraping dei prezzi
- flood di messaggi WhatsApp

**Soluzione temporanea** (senza backend):
```javascript
// In app.js — implementare rate limiting lato client
// (NOTA: questo è bypassabile, è solo deterrenza)
const rateLimitMap = new Map();
const RATE_LIMIT_MS = 30000; // 30 secondi tra richieste

function checkRateLimit(key) {
    const now = Date.now();
    const last = rateLimitMap.get(key) || 0;
    if (now - last < RATE_LIMIT_MS) return false;
    rateLimitMap.set(key, now);
    return true;
}
```

**Soluzione reale** (richiede Netlify Pro/Team): Abilitare Netlify Rate Limiting nella dashboard o usare una funzione serverless con contatore.

---

#### C5 — Dati Alloggiati Web in cleartext (CRITICA per obbligo legale)

**Problema**: Se registri gli ospiti su **Alloggiati Web** (portale Questura), questi dati (nome, cognome, data nascita, nazionalità, documento) sono **dati personali sensibili**. Il sito attuale non li gestisce affatto (fa tutto via WhatsApp/email), ma se decidi di digitalizzare il processo:

- **NON** inviare questi dati via WhatsApp (non è crittografato end-to-end in modo sicuro)
- **NON** usare email normali (SMTP è in chiaro)
- **NON** memorizzarli in database senza crittografia at-rest
- **Usare**: servizio dedicato tipo **Nexikey**, **Beds24**, o una **funzione serverless crittografata**

Questo non è un bug attuale — è un **警告** (avvertimento) per il futuro.

---

### 🟠 ALTA PRIORITÀ (Settimane 3-5)

#### A1 — ARIA ACCESSIBILITY (ALTA)

**Problema**: Il sito manca completamente di attributi ARIA. Screen reader per non vedenti e browser testuali non possono navigare correttamente.

**Criticità specifiche trovate nel codice**:
- Il cookie banner ha `id="cookieBanner"` ma nessun `role="banner"` o `aria-live`
- La navigazione mobile ha `aria-label="Menu"` solo sul bottone, non sulla struttura nav
- Il calendario Flatpickr ha `<input type="text">` senza `aria-label`, `aria-describedby`
- I bottoni FAQ non hanno `aria-expanded`, `aria-controls`
- La galleria lightbox non ha `aria-label` sul link `<a>` — solo su `<img alt>`
- Mancano focus styles visibili su tutti i link (`outline: none` mai riabilitato)
- Nessuna skip navigation (`<a href="#main-content" class="skip-link">`)
- Il custom cursor nasconde il cursore di sistema (`cursor: none`) ma non sostituisce con un focus indicator equivalente per tastiera

**Codice di fix minimale** (da aggiungere a style.css e HTML):

```css
/* Skip to content — invisibile finché non è focus */
.skip-link {
    position: absolute;
    top: -100%;
    left: 50%;
    transform: translateX(-50%);
    background: var(--color-accent);
    color: #fff;
    padding: 0.75rem 2rem;
    z-index: 99999;
    text-decoration: none;
    font-weight: 600;
    border-radius: 0 0 8px 8px;
    transition: top 0.3s;
}
.skip-link:focus {
    top: 0;
    outline: 3px solid #fff;
    outline-offset: 2px;
}

/* Focus styles universali — SOSTITUISCI outline: none ovunque */
:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 3px;
}

/* Rimuovi outline default solo quando c'è :focus-visible */
:focus:not(:focus-visible) {
    outline: none;
}
```

```html
<!-- In index.html, prima del <nav> -->
<a href="#main-content" class="skip-link">
    <span class="lang-it">Vai al contenuto principale</span>
    <span class="lang-en">Skip to main content</span>
</a>
```

```html
<!-- FAQ Button — aggiungere ARIA -->
<button class="faq-question"
    aria-expanded="false"
    aria-controls="faq-answer-1">
    ...
    <span class="faq-icon" aria-hidden="true">+</span>
</button>
<div id="faq-answer-1" class="faq-answer" hidden>
    <p>...</p>
</div>
```

---

#### A2 — REFACTORING CON TAILWIND CSS (ALTA)

**Motivazione**: Il CSS attuale è un singolo file monolitico di 870 righe che funziona ma è **impossibile da manutenere** per un redesign completo. Ogni nuova sezione richiede taglia-incolla di pattern esistenti. Tailwind risolve:
- **Coerenza** tra tutti i componenti (spacing, colori, typography)
- **Responsive design** nativo senza media query ripetute
- **Purging** automatico = CSS finale minuscolo
- **Design system** documentato in `tailwind.config.js`

**Piano di migrazione**:
1. Installare Tailwind via PostCSS o CDN
2. Configurare `tailwind.config.js` con la palette esistente + nuovi token
3. Convertire ogni sezione una alla volta (Hero → Concept → Amenities → etc.)
4. Eliminare le vecchie classi CSS una volta migrato il componente

**Configurazione Tailwind proposta per Mont°6** (design system):

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './privacy.html', './success.html'],
  theme: {
    extend: {
      colors: {
        ivory: '#FDFBF7',
        charcoal: '#1A221E',
        gold: '#C5A059',
        'gold-light': 'rgba(197, 160, 89, 0.08)',
        'text-main': '#1A1A1A',
        'text-muted': '#5A5A5A',
      },
      fontFamily: {
        heading: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        'ultra-wide': '0.3em',
      },
      boxShadow: {
        'luxe-sm': '0 4px 30px rgba(0, 0, 0, 0.04)',
        'luxe-md': '0 15px 50px rgba(0, 0, 0, 0.08)',
        'luxe-lg': '0 30px 80px rgba(0, 0, 0, 0.12)',
        'luxe-xl': '0 25px 60px rgba(0, 0, 0, 0.06)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'float': 'float 6s ease-in-out infinite',
        'line-drop': 'drop 2s infinite',
        'pulse-gold': 'pulseGold 3s ease-in-out infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(40px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-15px)' },
        },
        drop: {
          '0%': { top: '-100%' },
          '100%': { top: '100%' },
        },
        pulseGold: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),    // Form styling
    require('@tailwindcss/typography'), // Prose per contenuti lunghi
    require('@tailwindcss/aspect-ratio'), // Video embeds
  ],
}
```

---

#### A3 — REDESIGN FUNNEL DI BOOKING (ALTA)

**Problema attuale**: Il funnel è un unico grande modulo con:
- Calendario Flatpickr (ok)
- Select ospiti (ok)
- Due bottoni CTA con logica identica (WhatsApp + Stripe)
- Il bottone Stripe reindirizza a una funzione serverless che NON è attiva

**Funnel attuale**: `Calendario → Select → CTA → WhatsApp/Stripe`

**Funnel proposto** (3 step con progress indicator):

```
┌─────────────────────────────────────────────────────────┐
│  ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  33%  │
│  Step 1 di 3: Date                                      │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │     📅 Check-in          📅 Check-out           │   │
│  │    [  Select date  ]    [  Select date  ]       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  👥 Ospiti: [  2 成人  ]  (children selector)          │
│                                                         │
│  ⚠️ Soggiorno minimo: 2 notti                          │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  💶 Totale stimato: €320 (2 notti × €160)       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│              [ Continua → ]                             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  66%  │
│  Step 2 di 3: Dati Ospite                               │
│                                                         │
│  Nome completo * [____________________________]          │
│  Email *        [____________________________]          │
│  Telefono       [____________________________]          │
│  Nazionalità    [____________________________]          │
│  Note           [____________________________]          │
│                                                         │
│              [ Indietro ]  [ Continua → ]               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  100%   │
│  Step 3 di 3: Conferma                                  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Riepilogo prenotazione                          │   │
│  │  📅 15 - 17 Luglio 2026                         │   │
│  │  👥 2 Ospiti                                    │   │
│  │  💶 Totale: €320                                │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  📱 Richiedi via WhatsApp — Risposta in minuti   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  💳 Paga con Carta — Checkout sicuro Stripe      │   │
│  │     🔒 Protetto da SSL + 3D Secure               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  □ Accetto i <a href="privacy.html">Termini</a>         │
│                                                         │
│              [ Indietro ]                               │
└─────────────────────────────────────────────────────────┘
```

**Miglioramenti chiave**:
1. **Progress bar visiva** — riduce l'ansia da "quanto manca?"
2. **Step 2 raccoglie dati ospite** — pronti per Alloggiati Web futuro
3. **Checkbox termini** — copre legalmente il consenso al trattamento dati (GDPR)
4. **Riepilogo sempre visibile** — trasparenza sul prezzo a ogni step

**Codice base per il multi-step** (Tailwind + Alpine.js):

```html
<!-- Multi-step booking — Architettura con Alpine.js -->
<div x-data="bookingStepper()"
     x-cloak
     class="max-w-2xl mx-auto">

    <!-- Progress Bar -->
    <div class="mb-8">
        <div class="flex items-center justify-between mb-2">
            <span class="text-xs uppercase tracking-ultra-wide text-text-muted">
                <span x-text="$store.lang === 'it' ? 'Step' : 'Step'"></span>
                <span x-text="currentStep"></span>
                <span x-text="$store.lang === 'it' ? 'di 3' : 'of 3'"></span>
            </span>
            <span class="text-xs font-heading" x-text="Math.round(currentStep / 3 * 100) + '%'"></span>
        </div>
        <div class="h-1 bg-charcoal/10 rounded-full overflow-hidden">
            <div class="h-full bg-gold rounded-full transition-all duration-700"
                 :style="`width: ${(currentStep / 3) * 100}%`"></div>
        </div>
    </div>

    <!-- Step 1: Date -->
    <div x-show="currentStep === 1" x-transition:enter="transition ease-out duration-300"
         x-transition:enter-start="opacity-0 translate-x-8"
         x-transition:enter-end="opacity-1 translate-x-0">
        <!-- Date picker component -->
        <template x-if="datesSelected">
            <div class="bg-gold-light border border-gold/20 rounded-xl p-4 mb-6">
                <div class="flex justify-between items-center">
                    <span class="text-sm text-text-muted" x-text="$store.lang === 'it' ? 'Totale stimato' : 'Estimated total'"></span>
                    <span class="font-heading text-2xl text-gold" x-text="'€' + totalPrice"></span>
                </div>
            </div>
        </template>
        <button @click="nextStep()" class="btn-luxe w-full justify-center">
            <span x-text="$store.lang === 'it' ? 'Continua' : 'Continue'"></span>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
            </svg>
        </button>
    </div>

    <!-- Step 2: Guest Data -->
    <div x-show="currentStep === 2" x-transition:enter="transition ease-out duration-300"
         x-transition:enter-start="opacity-0 translate-x-8"
         x-transition:enter-end="opacity-1 translate-x-0">
        <div class="space-y-4">
            <div>
                <label class="block text-xs uppercase tracking-widest text-text-muted mb-2">
                    <span x-text="$store.lang === 'it' ? 'Nome completo *' : 'Full name *'"></span>
                </label>
                <input type="text" x-model="guestData.name" required
                       class="luxe-input-field">
            </div>
            <div>
                <label class="block text-xs uppercase tracking-widest text-text-muted mb-2">
                    <span x-text="$store.lang === 'it' ? 'Email *' : 'Email *'"></span>
                </label>
                <input type="email" x-model="guestData.email" required
                       class="luxe-input-field">
            </div>
            <div>
                <label class="block text-xs uppercase tracking-widest text-text-muted mb-2">
                    <span x-text="$store.lang === 'it' ? 'Telefono' : 'Phone'"></span>
                </label>
                <input type="tel" x-model="guestData.phone"
                       class="luxe-input-field">
            </div>
        </div>
        <div class="flex gap-4 mt-8">
            <button @click="prevStep()" class="btn-outline flex-1 justify-center">
                <span x-text="$store.lang === 'it' ? 'Indietro' : 'Back'"></span>
            </button>
            <button @click="nextStep()" class="btn-luxe flex-1 justify-center">
                <span x-text="$store.lang === 'it' ? 'Continua' : 'Continue'"></span>
            </button>
        </div>
    </div>

    <!-- Step 3: Confirmation + CTAs -->
    <div x-show="currentStep === 3" x-transition:enter="transition ease-out duration-300"
         x-transition:enter-start="opacity-0 translate-x-8"
         x-transition:enter-end="opacity-1 translate-x-0">
        <!-- Booking Summary Card -->
        <div class="bg-ivory border border-charcoal/5 rounded-2xl p-6 mb-6 shadow-luxe-sm">
            <h3 class="font-heading text-xl mb-4" x-text="$store.lang === 'it' ? 'Riepilogo' : 'Summary'"></h3>
            <dl class="space-y-3 text-sm">
                <div class="flex justify-between">
                    <dt class="text-text-muted">📅 Check-in</dt>
                    <dd class="font-medium" x-text="formatDate(checkIn)"></dd>
                </div>
                <div class="flex justify-between">
                    <dt class="text-text-muted">📅 Check-out</dt>
                    <dd class="font-medium" x-text="formatDate(checkOut)"></dd>
                </div>
                <div class="flex justify-between">
                    <dt class="text-text-muted">👥 <span x-text="$store.lang === 'it' ? 'Ospiti' : 'Guests'"></span></dt>
                    <dd class="font-medium" x-text="guestCount"></dd>
                </div>
                <div class="border-t border-charcoal/10 pt-3 flex justify-between">
                    <dt class="font-heading text-base"><span x-text="$store.lang === 'it' ? 'Totale' : 'Total'"></span></dt>
                    <dd class="font-heading text-2xl text-gold" x-text="'€' + totalPrice"></dd>
                </div>
            </dl>
        </div>

        <!-- Privacy Consent -->
        <label class="flex items-start gap-3 mb-6 cursor-pointer group">
            <input type="checkbox" x-model="consentGiven"
                   class="mt-1 w-4 h-4 accent-gold rounded">
            <span class="text-sm text-text-muted leading-relaxed">
                <span x-text="$store.lang === 'it'
                    ? 'Accetto la '
                    : 'I accept the '"></span>
                <a href="privacy.html" target="_blank"
                   class="text-gold hover:underline"
                   x-text="$store.lang === 'it' ? 'Privacy Policy' : 'Privacy Policy'"></a>
                <span x-text="$store.lang === 'it'
                    ? ' e acconsento al trattamento dei miei dati per la prenotazione.'
                    : ' and consent to the processing of my data for the booking.'"></span>
            </span>
        </label>

        <!-- Dual CTAs -->
        <a :href="whatsappUrl" target="_blank"
           class="btn-luxe btn-whatsapp w-full justify-center mb-3">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
            </svg>
            <span x-text="$store.lang === 'it' ? 'Richiedi via WhatsApp' : 'Request via WhatsApp'"></span>
        </a>

        <button @click="handleStripe()" :disabled="!consentGiven"
                class="btn-luxe btn-stripe w-full justify-center"
                :class="{ 'opacity-40 cursor-not-allowed': !consentGiven }">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
            </svg>
            <span x-text="$store.lang === 'it' ? 'Prenota e Paga Online' : 'Book & Pay Online'"></span>
        </button>

        <button @click="prevStep()" class="w-full mt-4 text-text-muted text-sm hover:text-gold transition-colors">
            ← <span x-text="$store.lang === 'it' ? 'Indietro' : 'Back'"></span>
        </button>
    </div>
</div>

<script>
function bookingStepper() {
    return {
        currentStep: 1,
        checkIn: null,
        checkOut: null,
        guestCount: 2,
        guestData: { name: '', email: '', phone: '' },
        consentGiven: false,

        get datesSelected() {
            return this.checkIn && this.checkOut;
        },
        get nights() {
            if (!this.checkIn || !this.checkOut) return 0;
            return Math.ceil((this.checkOut - this.checkIn) / (1000 * 60 * 60 * 24));
        },
        get totalPrice() {
            return this.nights * 160; // Sostituire con logica prezzi mensili reali
        },
        get whatsappUrl() {
            if (!this.datesSelected) return '#';
            const lang = Alpine.store('lang') || 'it';
            const msg = lang === 'it'
                ? `Salve! Vorrei verificare la disponibilità per Mont°6.\n\n📅 Check-in: ${this.formatDate(this.checkIn)}\n📅 Check-out: ${this.formatDate(this.checkOut)}\n👥 Ospiti: ${this.guestCount}\n\nNome: ${this.guestData.name}\nEmail: ${this.guestData.email}`
                : `Hi! I'd like to check availability for Mont°6.\n\n📅 Check-in: ${this.formatDate(this.checkIn)}\n📅 Check-out: ${this.formatDate(this.checkOut)}\n👥 Guests: ${this.guestCount}\n\nName: ${this.guestData.name}\nEmail: ${this.guestData.email}`;
            return `https://wa.me/393881908816?text=${encodeURIComponent(msg)}`;
        },
        nextStep() { if (this.currentStep < 3) this.currentStep++; },
        prevStep() { if (this.currentStep > 1) this.currentStep--; },
        formatDate(date) {
            if (!date) return '';
            return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
        },
        async handleStripe() {
            // Chiamata a Netlify Function
        }
    }
}
</script>
```

---

### 🟡 MEDIA PRIORITÀ (Settimane 6-10)

#### M1 — PERFORMANCE: OTTIMIZZAZIONE IMMAGINI (MEDIA)

**Problema**: 60+ immagini caricate, nessun lazy loading reale (solo `loading="lazy"` nativo), nessuna compressione, nessun WebP, nessun `srcset` per risoluzioni multiple.

**Impatto stimato**: LCP (Largest Contentful Paint) probabile > 3s su mobile.

**Soluzione**:

1. **Convertire tutto in WebP** (risparmio ~60-80% dimensione)
2. **Generare 3 resize per ogni immagine**: mobile (480w), tablet (1024w), desktop (1920w)
3. **Implementare `srcset` responsive**

```html
<!-- Esempio di picture element con WebP + srcset -->
<picture>
    <source
        type="image/webp"
        srcset="
            img/hero-480.webp 480w,
            img/hero-1024.webp 1024w,
            img/hero-1920.webp 1920w
        "
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1400px"
    >
    <img
        src="img/hero-1024.jpg"
        alt="..."
        loading="lazy"
        decoding="async"
        width="1920"
        height="1080"
    >
</picture>
```

4. **Critical CSS inline** per hero (prima immagine above the fold)
5. **Preload** per la hero image
6. **Responsive image con `fetchpriority="high"`** solo per la hero

```html
<!-- In <head>, solo per la hero -->
<link rel="preload" as="image" href="img/hero-1920.webp" fetchpriority="high">
```

**Pipeline consigliata** (Gridsome/Cloudinary/ImageKit):
- Usa **Cloudinary** o **ImageKit** per trasformazione automatica
- Oppure script Node.js locale con `sharp` per generare resize + WebP in build

```javascript
// build:optimize-images.js — Esegui prima del deploy
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const WIDTHS = [480, 800, 1024, 1920];
const INPUT_DIR = './Img';
const OUTPUT_DIR = './img/optimized';

fs.readdirSync(INPUT_DIR).forEach(file => {
    if (!file.match(/\.(jpg|jpeg|png)$/i)) return;

    const inputPath = path.join(INPUT_DIR, file);
    const name = path.parse(file).name;

    Promise.all(WIDTHS.map(w =>
        sharp(inputPath)
            .resize(w)
            .webp({ quality: 80 })
            .toFile(path.join(OUTPUT_DIR, `${name}-${w}.webp`))
    ));
});
```

---

#### M2 — MICRO-INTERAZIONI AVANZATE (MEDIA)

**Problema**: Animazioni esistenti sono basilari (`reveal-up`, `reveal-right`). Manca:
- Stagger animations (elementi che appaiono in sequenza)
- Parallax sofisticato
- Magnetic buttons (già presenti ma solo su desktop)
- Page transitions
- Scroll-linked animations

**Proposta di stack**:
- **GSAP** (GreenSock) per animazioni complesse — è lo standard de facto per animazioni web premium
- **ScrollTrigger** plugin di GSAP per scroll-linked animations

**Esempio — Sezione Hero con animazione cinematica**:

```javascript
// hero-animation.js — GSAP Timeline
gsap.registerPlugin(ScrollTrigger);

// Hero entrance sequence
const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });

heroTl
    .from('.hero-bg', {
        scale: 1.15,
        duration: 1.8,
        ease: 'power2.out'
    })
    .from('.hero-kicker', {
        opacity: 0,
        y: 30,
        duration: 0.8
    }, '-=1.2')
    .from('.hero-title', {
        opacity: 0,
        y: 50,
        duration: 1
    }, '-=0.6')
    .from('.hero-meta .hero-badge', {
        opacity: 0,
        y: 20,
        stagger: 0.1,
        duration: 0.6
    }, '-=0.4')
    .from('.btn-hero', {
        opacity: 0,
        scale: 0.9,
        duration: 0.6
    }, '-=0.2');

// Parallax scroll effect
gsap.to('.hero-bg', {
    yPercent: 30,
    ease: 'none',
    scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: true
    }
});

// Section reveal con stagger
document.querySelectorAll('.section').forEach(section => {
    gsap.from(section.querySelectorAll('.reveal-item'), {
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
```

**CSS custom per hover states premium**:

```css
/* Card hover — lift + glow */
.explore-card {
    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
                box-shadow 0.4s ease;
    will-change: transform;
}
.explore-card:hover {
    transform: translateY(-8px) scale(1.02);
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.12),
                0 0 0 1px rgba(197, 160, 89, 0.1);
}

/* Image zoom interno */
.explore-img {
    transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
    will-change: transform;
}
.explore-card:hover .explore-img {
    transform: scale(1.08);
}

/* Magnetic button effect */
.magnetic-btn {
    position: relative;
    transition: transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

/* Ripple effect sul click */
.btn-luxe {
    position: relative;
    overflow: hidden;
}
.btn-luxe::after {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    top: 50%;
    left: 50%;
    background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
    transform: translate(-50%, -50%) scale(0);
    transition: transform 0.5s ease-out;
    pointer-events: none;
}
.btn-luxe:active::after {
    transform: translate(-50%, -50%) scale(2);
    transition: transform 0s;
}
```

---

#### M3 — LAYOUT ASIMMETRICO AVANZATO (MEDIA)

**Problema attuale**: Il layout è a griglia regolare 50/50 o 33/33/33. Non male, ma non "boutique hotel di lusso".

**Proposta — Editorial Layout con asimmetrie calcolate**:

```css
/* Concept Section — Layout asimettrico */
/*
 *  BEFORE (attuale):  |  TEXT   |  IMAGE  |
 *  AFTER (proposto): |         |         |
 *                     |  TEXT   | IMAGE   |
 *                     |         | (offset)|
 *                     |(overlap)|         |
 */

.concept-editorial {
    display: grid;
    grid-template-columns: 1fr 45%;
    gap: 0;
    position: relative;
}

.ed-text-box {
    padding: var(--space-xl) var(--space-l) var(--space-xl) 10%;
    background: var(--color-bg-light);
    position: relative;
    z-index: 2;
}

.img-wrapper {
    position: relative;
    margin-top: calc(var(--space-xl) * -1);
    margin-left: -15%;
    width: 90%;
}

.img-main {
    position: relative;
    clip-path: polygon(10% 0, 100% 0, 100% 90%, 90% 100%, 0 100%, 0 10%);
}

.img-sec {
    position: absolute;
    bottom: -80px;
    right: -60px;
    width: 50%;
    clip-path: polygon(0 0, 100% 0, 100% 85%, 85% 100%, 0 100%, 0 15%);
    z-index: 3;
    border: 8px solid var(--color-bg-light);
}

/* Parallax break section — enhanced */
.parallax-break {
    min-height: 80vh;
    display: grid;
    place-items: center;
    position: relative;
}

.parallax-break::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
        135deg,
        rgba(26, 34, 30, 0.6) 0%,
        rgba(26, 34, 30, 0.3) 50%,
        rgba(197, 160, 89, 0.1) 100%
    );
}

.break-title {
    position: relative;
    z-index: 2;
    font-size: clamp(3rem, 8vw, 7rem);
    text-align: center;
    max-width: 900px;
    padding: 0 2rem;
    text-shadow: 0 4px 40px rgba(0, 0, 0, 0.3);
}

/* Review cards — floating stacked cards */
.reviews-desktop-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: auto;
    gap: 0;
    position: relative;
}

.review-card-luxe:nth-child(1) {
    transform: translateY(0) rotate(-1deg);
    z-index: 3;
}
.review-card-luxe:nth-child(2) {
    transform: translateY(30px) rotate(0.5deg);
    z-index: 2;
}
.review-card-luxe:nth-child(3) {
    transform: translateY(60px) rotate(-0.5deg);
    z-index: 1;
}

.review-card-luxe:hover {
    transform: translateY(20px) rotate(0deg) scale(1.02);
    z-index: 10;
    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

---

#### M4 — RESPONSIVE MOBILE DI CLASSE (MEDIA)

**Problema attuale**: Il mobile funziona ma non è "mobile-first" nell'esperienza. Molti elementi sono ancora "desktop in scala".

**Interventi**:

1. **Bottom sheet per il calendario** invece di inline
2. **Drawer menu** invece di fullscreen overlay (più naturale su mobile)
3. **Touch-optimized tap targets** (min 48x48px)
4. **Swipe gestures** per la galleria

```html
<!-- Mobile Bottom Sheet Calendar -->
<div x-data="{ open: false }">
    <!-- Trigger -->
    <button @click="open = true"
            class="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-charcoal/10">
        <span class="text-sm text-text-muted">Check-in / Check-out</span>
        <svg class="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
    </button>

    <!-- Bottom Sheet -->
    <div x-show="open"
         x-transition:enter="transition ease-out duration-300"
         x-transition:enter-start="opacity-0"
         x-transition:enter-end="opacity-100"
         x-transition:leave="transition ease-in duration-200"
         x-transition:leave-start="opacity-100"
         x-transition:leave-end="opacity-0"
         @click.away="open = false"
         class="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-sm"
         style="display: none;">
        <div @click.stop
             x-transition:enter="transition ease-out duration-400"
             x-transition:enter-start="translate-y-full"
             x-transition:enter-end="translate-y-0"
             x-transition:leave="transition ease-in duration-200"
             x-transition:leave-start="translate-y-0"
             x-transition:leave-end="translate-y-full"
             class="absolute bottom-0 left-0 right-0 bg-ivory rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto">
            <div class="w-12 h-1 bg-charcoal/20 rounded-full mx-auto mb-6"></div>
            <input type="text" id="mobile-date-range" class="luxe-input">
        </div>
    </div>
</div>
```

---

#### M5 — VIDEO TOUR (MEDIA)

**Dato**: Le proprietà con video tour hanno tassi di conversione **30-80%** superiori secondo studi Airbnb/Booking.com.

**Proposta**:
1. Girare un video 4K di 90 secondi (droni + interni)
2. Hosting su **Cloudflare Stream** o **Mux** (CDN globale, costi contenuti)
3. Implementare con poster image + lazy load del video

```html
<!-- Video Tour Hero replacement (sulla hero section) -->
<div class="video-hero-wrapper relative overflow-hidden rounded-none md:rounded-2xl">
    <video
        x-data="{
            loaded: false,
            playing: false
        }"
        x-init="
            $watch('loaded', val => {
                if (val) $refs.poster.style.opacity = '0';
            })
        "
        @loadeddata="loaded = true"
        x-ref="video"
        class="absolute inset-0 w-full h-full object-cover"
        autoplay muted loop playsinline
        poster="img/hero-poster.jpg">
        <source src="video/mont6-tour-optimized.mp4" type="video/mp4">
        <!-- Fallback -->
        <img src="img/hero-poster.jpg" alt="Mont°6 Cefalù" class="w-full h-full object-cover">
    </video>

    <!-- Video Controls -->
    <div class="absolute bottom-6 right-6 z-10">
        <button @click="$refs.video.paused ? $refs.video.play() : $refs.video.pause()"
                class="bg-white/20 backdrop-blur-md rounded-full p-3 hover:bg-white/30 transition-colors">
            <svg x-show="$refs.video?.paused" class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
            </svg>
            <svg x-show="!$refs.video?.paused" class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
        </button>
    </div>
</div>
```

---

## 3. ROADMAP DI IMPLEMENTAZIONE

```
SETTIMANA 1-2: SICUREZZA (Critical Fix)
├── Deploy _headers su Netlify
├── Spostare blocked-dates.json in funzione serverless
├── Implementare rate limiting base
└── Aggiungere ARIA e skip-link

SETTIMANA 3-5: UX CORE (Major Refactor)
├── Setup Tailwind + PostCSS
├── Refactoring Hero + Concept section
├── Multi-step booking funnel
├── Responsive mobile-first redesign
└── A11y completo

SETTIMANA 6-8: PERFORMANCE (Optimization)
├── Conversione immagini in WebP + srcset
├── Implementazione GSAP ScrollTrigger
├── Critical CSS per above-the-fold
└── Lazy loading avanzato

SETTIMANA 9-10: POLISH (Premium Feel)
├── Video tour integration
├── Magnetic buttons ottimizzati
├── Layout asimmetrico avanzato
└── Test cross-browser + a11y audit finale
```

---

## 4. RISPOSTE AI QUESITI SPECIFICI

### 4a. Header di Sicurezza: Quali implementare?

Ho già creato il file `_headers` per Netlify. Gli header da implementare sono:

| Header | Valore | Perché |
|---|---|---|
| `Content-Security-Policy` | Vedi `_headers` | Previene XSS, clickjacking, data injection |
| `X-Frame-Options` | `DENY` | Previene clickjacking |
| `X-Content-Type-Options` | `nosniff` | Previene MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limita info referrer in uscita |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Nega permessi non necessari |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Forza HTTPS sempre (richiede SSL attivo su Netlify — c'è già) |
| `Cache-Control` | `public, max-age=31536000, immutable` per assets | Caching aggressive di immagini/CSS/JS |

### 4b. Data Handling: Protezione XSS e CSRF

**XSS Prevention** (già parzialmente coperto dal CSP, ma serve layered defense):

```javascript
// Sanitizzazione input — DA USARE su ogni input utente
function sanitizeInput(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Validazione email
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Validazione date
function isValidDateRange(checkIn, checkOut) {
    const ci = new Date(checkIn);
    const co = new Date(checkOut);
    const now = new Date();
    now.setHours(0,0,0,0);
    return ci >= now && co > ci;
}

// CSRF Protection — richiede backend
// Per le funzioni serverless Stripe, usare:
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

async function verifyStripeWebhook(req) {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            stripeWebhookSecret
        );
    } catch (err) {
        throw new Error(`Webhook Error: ${err.message}`);
    }
    return event;
}
```

### 4c. Gestione API e Terze Parti

**Stripe Integration** (hardening):

```javascript
// ❌ SBAGLIATO — mai esporre chiave privata lato client
const stripe = Stripe('pk_live_...'); // Solo chiave pubblica!

// ✅ CORRETTO — solo chiave pubblica in frontend
const stripe = Stripe('pk_live_xxxxxxxxxxxx');

// Per operazioni sensibili: MAI chiamare Stripe dal frontend
// Usare SEMPRE Netlify Functions / serverless come proxy
// Il frontend chiama -> funzione serverless -> Stripe API

// netlify/functions/create-checkout-session.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
    // Validazione input
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { checkIn, checkOut, guests, guestEmail, guestName } = JSON.parse(event.body);

    // Validazione lato server
    if (!checkIn || !checkOut || !guestEmail) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    // Rate limiting — verificare IP
    const clientIp = event.headers['x-forwarded-for']?.split(',')[0];
    // Implementare check con Redis o KV store (Netlify Pro)

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            customer_email: guestEmail,
            line_items: [{
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: 'Mont°6 Luxury Retreat - Cefalù',
                        description: `${formatDate(checkIn)} - ${formatDate(checkOut)}`,
                        images: ['https://mont6cefalu.it/img/_MG_4132.jpg'],
                    },
                    unit_amount: calculateTotal(checkIn, checkOut) * 100,
                },
                quantity: 1,
            }],
            success_url: `${process.env.URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.URL}/#booking`,
            metadata: {
                checkIn,
                checkOut,
                guests,
                guestName,
            },
        });

        return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};
```

**Google Maps Integration**:

```html
<!-- ❌ VULNERABILE — embed senza protezioni -->
<iframe src="https://www.google.com/maps/embed?pb=..."></iframe>

<!-- ✅ MIGLIORATO — con CSP allow e no-referrer -->
<iframe
    src="https://www.google.com/maps/embed?pb=..."
    loading="lazy"
    referrerpolicy="no-referrer-when-downgrade"
    title="Mont°6 - Posizione a Cefalù"
    aria-label="Mappa interattiva di Mont°6 a Cefalù, Sicilia"
    style="border:0; border-radius: 8px;"
    allowfullscreen>
</iframe>

<!-- ✅ MIGLIORE — immagine statica con link alla mappa (zero JavaScript esterno) -->
<a href="https://www.google.com/maps/dir//38.0386,14.0226"
   target="_blank"
   rel="noopener noreferrer"
   class="group relative block rounded-2xl overflow-hidden">
    <img
        src="https://maps.googleapis.com/maps/api/staticmap?center=38.0386,14.0226&zoom=16&size=800x400&maptype=roadmap&markers=color:0xC5A059%7C38.0386,14.0226&key=YOUR_API_KEY"
        alt="Mappa di Mont°6 a Cefalù, aperta in Google Maps"
        loading="lazy"
        class="w-full h-auto rounded-2xl shadow-luxe-md group-hover:shadow-luxe-lg transition-shadow"
    >
    <div class="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/10 transition-colors flex items-center justify-center">
        <span class="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
            ↗ Apri in Google Maps
        </span>
    </div>
</a>
```

**WhatsApp Integration**:

```javascript
// ❌ PROBLEMA: URL WhatsApp in chiaro nel codice sorgente
// L'utente malintenzionato può scraping tutti i numeri di telefono
const hostPhone = "393881908816"; // In chiaro!

// ✅ MIGLIORE: codificare o usare funzione serverless
// Opzione 1: Base64 obfuscation (detersione, non sicurezza reale)
const encoded = btoa('MzkzODgxOTA4ODE2'); // '393881908816'
// Opzione 2: Environment variable in funzione serverless
// Netlify Dashboard → Site Settings → Environment Variables
// La funzione legge process.env.HOST_PHONE e costruisce l'URL

// Opzione 3 (consigliata): Usare API WhatsApp Business
// https://business.whatsapp.com/developers/developer-hub
// Integrazione ufficiale con message templating per template
```

---

## 5. COSTO/TEMPO STIMATO

| Fase | Ore stimate | Complessità |
|---|---|---|
| Sicurezza (C1-C5) | 4-6h | Bassa |
| Accessibilità (A1) | 3-4h | Bassa |
| Tailwind Refactor (A2) | 15-20h | Media |
| Booking Funnel (A3) | 10-15h | Media-Alta |
| Performance (M1) | 5-8h | Media |
| Micro-interazioni (M2) | 8-12h | Media |
| Layout asimmetrico (M3) | 6-8h | Media |
| Mobile polish (M4) | 6-10h | Media |
| Video tour (M5) | 4-6h | Bassa (se video già girato) |
| **TOTALE** | **61-89h** | |

---

## 6. STOCK TECNOLOGICO CONSIGLIATO

| Categoria | Attuale | Consigliato |
|---|---|---|
| CSS Framework | Vanilla CSS monolitico | Tailwind CSS v3 + PostCSS |
| Animation | Vanilla JS + CSS transitions | GSAP + ScrollTrigger |
| JS Framework | Vanilla JS | Alpine.js (leggero, ideale per interazioni) + HTMX (per AJAX senza framework) |
| Icons | Inline SVG | Lucide Icons (tree-shakeable, coerente) |
| Calendar | Flatpickr | Mantenere Flatpickr (funziona) |
| Lightbox | GLightbox | Mantenere (funziona) |
| Fonts | Google Fonts CDN | Self-host con `fontsource` (eliminare external call) |
| Images CDN | Locali | Cloudinary o ImageKit |
| Deploy | Netlify | Netlify (già in uso, ottimo) |
| Backend | Netlify Functions (non attivo) | Attivare + Stripe webhook handler |
| Analytics | Nessuno | Plausible Analytics (GDPR-compliant, no cookies) |
| Form/Email | WhatsApp/email | EmailJS o Netlify Forms |

---

## 7. PROSSIMI PASSI — DA CHIEDERE A TE

Per procedere con il refactoring, ho bisogno di:

1. **Accesso Netlify** — Nome del team/site per configurare `_headers` e variabili ambiente
2. **Chiavi Stripe** — La chiave pubblica `pk_live_...` (da verificare che sia in `app.js`) e la chiave privata `sk_live_...` (da usare SOLO nella funzione serverless, MAI in frontend)
3. **Budget temporale** — Quante ore/settimana puoi dedicare? Questo determina se procediamo con refactoring totale o per fasi
4. **Video esistente** — Hai già un video tour? Se no, bisogna pianificarlo
5. **Foto drone** — Hai scatti aerei della proprietà? Servono per il redesign della hero
6. **Integrazione Alloggiati Web** — Stai già usando un portale per la comunicazione dati ospiti alla Questura? Questo influenza l'architettura dati

---

*Documento generato il 26/06/2026. Le raccomandazioni di sicurezza sono conformi a OWASP Top 10 2021, GDPR (UE 2016/679), e best practice hospitality industry.*
