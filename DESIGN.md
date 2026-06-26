# Design

> Design system per Mont°6 Luxury Retreat — Cefalù, Sicily
> Version: 1.0 | Brand: Design-forward luxury

---

## Brand Expression

### Concept
Un rifugio di design dove l'autenticità siciliana incontra il comfort contemporaneo. Il sito trasmette **serena esclusività** — non intimidatorio, ma irresistibile. Come una cena a lume di candela con vista sul mare.

### Visual Metaphor
**"Antico appartamento nobiliare ri-dato"** — la pietra antica di Cefalù, la luce calda del Mediterraneo, l'artigianalità dei dettagli. Niente di troppo perfetto, niente di troppo rustico.

---

## Color Palette

### Primary Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-charcoal` | `#0F1210` | Testi primari, overlay scuri, footer |
| `--color-ivory` | `#FAF8F5` | Sfondo principale, respiro |
| `--color-gold` | `#B8965C` | Accenti, CTAs, elementi premium |

### Secondary Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-charcoal-light` | `#1A1F1C` | Hover states, cards scure |
| `--color-gold-light` | `#D4B896` | Testi accentati, gradients |
| `--color-gold-dark` | `#8C6F3C` | Hover su gold, stati attivi |
| `--color-gold-muted` | `#C9B896` | Scrollbar, bordi sottili |

### Utility Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-text` | `#1A1A1A` | Body text principale |
| `--color-text-light` | `#6B6B6B` | Testi secondari, captions |
| `--color-text-muted` | `#9A9A9A` | Placeholder, testo disabilitato |
| `--color-surface` | `#F8F5F0` | Sezioni alternate |
| `--color-overlay` | `rgba(15, 18, 16, 0.85)` | Overlay hero, modali |

### Dark Section Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Background | `#1A1F1C` | Sezioni scure (recensioni) |
| Surface | `rgba(255,255,255,0.03)` | Cards su sfondo scuro |
| Border | `rgba(255,255,255,0.05)` | Bordi cards scure |
| Text | `#FFFFFF` | Testo su sfondo scuro |
| Text-muted | `rgba(255,255,255,0.6)` | Testi secondari scuri |

---

## Typography

### Font Families

**Headings**: `Cormorant Garamond, Georgia, serif`
- Weight: 300-500
- Tracking: -0.02em a -0.03em
- Line-height: 0.95-1.1

**Body**: `Inter, system-ui, sans-serif`
- Weight: 300-500
- Tracking: normal
- Line-height: 1.75-1.8

### Type Scale

```
Display (Hero):    clamp(3.5rem, 10vw, 8rem)  — weight 300
Section heading:   clamp(2.5rem, 5vw, 4.5rem) — weight 400
Card heading:      clamp(1.5rem, 3vw, 2rem)   — weight 400
Body:              1rem                        — weight 400
Caption:           0.8rem                      — weight 400
Kicker:            0.7rem, UPPERCASE, 0.3em   — weight 500
```

### Style Guidelines

- **Display**: Italic per parole accentate con `text-gradient-italic`
- **Section headings**: Mix di regular + italic per ritmo visivo
- **Body**: Maiuscolo evitare; preferire frasi naturali
- **Kickers**: Sempre `text-gold`, uppercase, letter-spacing ampio

---

## Spacing System

### Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | 0.5rem (8px) | Elementi inline |
| `--space-sm` | 1rem (16px) | Padding cards, gap minimi |
| `--space-md` | 3rem (48px) | Gap tra elementi |
| `--space-lg` | 6rem (96px) | Padding sezioni |
| `--space-xl` | 10rem (160px) | Hero spacing |

### Section Padding

- Mobile: `py-24` (96px)
- Desktop: `py-40` (160px)
- Max-width container: `max-w-7xl` (80rem / 1280px)

---

## Motion Philosophy

### Principle
**"Suggerito, non esibito"** — Le animazioni esistono per guidare l'occhio e creare ritmo, non per impressionare. Nessuna animazione deve essere notata consciamente.

### Animation Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | Default, card hover |
| `--ease-luxe` | `cubic-bezier(0.22, 1, 0.36, 1)` | Scroll reveals, menus |
| `--transition-fast` | 0.3s | Hover micro-interactions |
| `--transition-medium` | 0.5s | Reveals, menus |
| `--transition-slow` | 0.8s | Parallax, heavy transitions |

### Animation Patterns

1. **Scroll Reveal**: Elementi entrano dal basso (translateY: 60px → 0), opacity 0 → 1, stagger 100-150ms
2. **Hover Lift**: Cards translateY: -8px, shadow intensifica
3. **Hero Ken Burns**: Scala da 1.15 a 1, durata 2.5s, ease-out
4. **Parallax**: Background scrolling a 25% della velocità normale
5. **Scroll Indicator**: Animazione continua top → bottom, 2s loop

### Motion Respect
```css
@media (prefers-reduced-motion: reduce) {
    * {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
    }
}
```

---

## Visual Assets

### Icons
- **Emoji**: Usare con parsimonia per elementi funzionali (badge, location cards)
- **SVG inline**: Solo per UI icons ripetuti (hamburger, frecce)

### Images
- **Hero**: Immagine full-bleed con overlay gradient (charcoal → trasparente)
- **Gallery**: Aspect ratio 3:4 per verticale, 16:9 per orizzontali
- **Cards**: Immagini con border-radius, hover zoom (scale: 1.08)

### Decorative Elements
- **Gold divider**: 60px × 1px, gradient da gold a gold-light
- **Section numbers**: Font monospace, opacity 0.6, color gold
- **Large background text**: Font heading, font-size 10-25rem, opacity 0.03
- **Gradient overlays**: Sfumature sottili per depth (10-15% opacity max)

---

## Components

### Buttons

#### Primary (btn-luxury)
```css
background: var(--color-gold);
color: white;
padding: 1rem 2.5rem;
font-size: 0.75rem;
letter-spacing: 0.15em;
text-transform: uppercase;
border-radius: 4px;
box-shadow: var(--shadow-gold-subtle);

/* Hover */
transform: translateY(-2px);
box-shadow: var(--shadow-gold);
```

#### Ghost (btn-ghost)
```css
background: transparent;
color: white;
border: 1px solid rgba(255,255,255,0.3);
padding: 0.875rem 2rem;

/* Hover */
background: rgba(255,255,255,0.1);
border-color: rgba(255,255,255,0.5);
```

### Cards

#### Luxury Card (card-luxury)
```css
background: white;
border-radius: 16px;
box-shadow: var(--shadow-soft);
padding: 2rem; /* mobile), 2.5rem (desktop)

/* Hover */
transform: translateY(-8px);
box-shadow: var(--shadow-elevated);
```

#### Dark Card (card-dark)
```css
background: var(--color-charcoal-light);
border: 1px solid rgba(255,255,255,0.05);
border-radius: 16px;

/* Hover */
background: var(--color-charcoal);
transform: translateY(-4px);
```

### Navigation

#### Navbar (nav-luxury)
```css
position: fixed;
padding: 1.5rem 0; /* iniziale */
transition: all 0.5s var(--ease-luxe);

/* Scrolled */
padding: 1rem 0;
background: rgba(15, 18, 16, 0.95);
backdrop-filter: blur(20px);
```

#### Nav Link
```css
font-size: 0.7rem;
text-transform: uppercase;
letter-spacing: 0.15em;
color: rgba(255,255,255,0.8);

/* Hover */
color: var(--color-gold);

/* Underline animation */
&::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 0;
    width: 0;
    height: 1px;
    background: var(--color-gold);
    transition: width 0.5s var(--ease-luxe);
}

&:hover::after {
    width: 100%;
}
```

### Form Inputs

```css
.input-luxury {
    width: 100%;
    padding: 1rem 0;
    border: none;
    border-bottom: 1px solid rgba(0,0,0,0.1);
    background: transparent;
    
    /* Focus */
    border-bottom-color: var(--color-gold);
}
```

### Badges

#### Luxury Badge
```css
padding: 0.5rem 1rem;
background: rgba(255,255,255,0.08);
backdrop-filter: blur(10px);
border: 1px solid rgba(255,255,255,0.15);
border-radius: 9999px;
```

#### Gold Badge
```css
background: rgba(184, 150, 92, 0.2);
border-color: rgba(184, 150, 92, 0.3);
color: var(--color-gold-light);
```

### Gallery

#### Gallery Item
```css
border-radius: 16px;
overflow: hidden;

img {
    transition: transform 0.8s var(--ease-luxe);
}

&:hover img {
    transform: scale(1.08);
}

/* Caption */
.gallery-caption {
    transform: translateY(10px);
    opacity: 0;
    transition: all 0.5s var(--ease-luxe);
}

&:hover .gallery-caption {
    transform: translateY(0);
    opacity: 1;
}
```

### FAQ Accordion

```css
.faq-item {
    border-bottom: 1px solid rgba(0,0,0,0.08);
    
    &.open .faq-answer {
        max-height: 300px;
        padding-bottom: 1.5rem;
    }
    
    &.open .faq-icon {
        transform: rotate(45deg);
    }
}

.faq-answer {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.4s var(--ease-out-quart);
}
```

### Review Cards

```css
background: rgba(255,255,255,0.03);
border: 1px solid rgba(255,255,255,0.05);
border-radius: 24px;
padding: 2.5rem;

.review-quote {
    position: absolute;
    top: 1.5rem;
    left: 2rem;
    font-size: 5rem;
    color: var(--color-gold);
    opacity: 0.1;
    line-height: 1;
}

/* Hover */
&:hover {
    background: rgba(255,255,255,0.06);
    transform: translateY(-4px);
}
```

### Location Cards

```css
background: white;
border-radius: 16px;
border: 1px solid rgba(0,0,0,0.04);
box-shadow: var(--shadow-soft);
padding: 1.25rem;
gap: 1rem;

.location-icon {
    width: 50px;
    height: 50px;
    background: rgba(184, 150, 92, 0.1);
    border-radius: 50%;
}

/* Hover */
transform: translateY(-4px);
box-shadow: var(--shadow-lifted);
```

---

## Shadows

### Scale

| Token | Value |
|-------|-------|
| `--shadow-soft` | `0 2px 8px rgba(0, 0, 0, 0.04)` |
| `--shadow-lifted` | `0 8px 30px rgba(0, 0, 0, 0.06)` |
| `--shadow-elevated` | `0 20px 60px rgba(0, 0, 0, 0.08)` |
| `--shadow-deep` | `0 30px 80px rgba(0, 0, 0, 0.12)` |
| `--shadow-gold` | `0 15px 50px rgba(184, 150, 92, 0.25)` |
| `--shadow-gold-subtle` | `0 8px 30px rgba(184, 150, 92, 0.15)` |

---

## Border Radius

| Token | Value |
|-------|-------|
| `--radius-xs` | 2px |
| `--radius-sm` | 4px |
| `--radius-md` | 8px |
| `--radius-lg` | 16px |
| `--radius-xl` | 24px |
| `--radius-full` | 9999px |

---

## Responsive Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| Mobile | < 640px | Layout base |
| Tablet | 640px - 1023px | Grid 2-col |
| Desktop | 1024px+ | Full layout, hover states |

### Key Responsive Rules
- **Typography**: Sempre fluid con `clamp()`
- **Spacing**: Mobile ridotto (75% di desktop)
- **Navigation**: Hamburger sotto 1024px
- **Hover effects**: Solo desktop
- **Parallax**: Disabilitato sotto 768px (background-attachment: scroll)

---

## Implementation

### Stack
- **CSS**: Tailwind CSS 3.x + custom CSS per animazioni avanzate
- **JavaScript**: Vanilla JS per interazioni, GSAP per animazioni complesse
- **Fonts**: Google Fonts (Cormorant Garamond, Inter) via CDN
- **Icons**: Emoji + SVG inline
- **Build**: PostCSS + Tailwind CLI

### Key Files
- `src/input.css` — Design tokens, componenti custom
- `tailwind.config.js` — Extended theme con custom colors, fonts, shadows
- `app.js` — Animazioni GSAP, interazioni DOM
- `index.html` — Markup con classi Tailwind + custom

### CDN Dependencies
```html
<!-- Fonts -->
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:...&family=Inter:...&display=swap" rel="stylesheet">

<!-- GSAP -->
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"></script>

<!-- Flatpickr (date picker) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
<script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>

<!-- GLightbox (gallery) -->
<script src="https://cdn.jsdelivr.net/npm/glightbox/dist/js/glightbox.min.js"></script>
```

---

## Anti-Patterns to Avoid

- ❌ Animazioni che durano più di 1 secondo
- ❌ Più di 3 animazioni simultanee
- ❌ Hover states su mobile (usare :active)
- ❌ Font-size sotto 14px per body text
- ❌ Contrast ratio sotto 4.5:1 per text
- ❌ Border-radius sopra 24px (troppo "app-like")
- ❌ Gradient pesanti come sfondo
- ❌ Ombre nere dense (max 12% opacity)
- ❌ Più di 2 font weights per heading
