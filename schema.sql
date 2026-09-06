-- Schema database D1 (Cloudflare) per le prenotazioni dirette di Mont°6
-- Applicare con:
--   npx wrangler d1 execute mont6-bookings --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS bookings (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    stripe_session_id  TEXT UNIQUE,           -- idempotenza: una riga per sessione Stripe
    check_in           TEXT NOT NULL,         -- formato YYYY-MM-DD
    check_out          TEXT NOT NULL,         -- formato YYYY-MM-DD
    guests             INTEGER,
    amount_total       INTEGER,               -- totale in centesimi
    currency           TEXT DEFAULT 'eur',
    guest_email        TEXT,
    guest_name         TEXT,
    status             TEXT DEFAULT 'confirmed',
    -- gestione email del ciclo ospite (idea #5): timestamp di invio, NULL = non ancora inviata
    sent_confirmation_at TEXT,             -- conferma di pagamento: NULL = non ancora inviata
    sent_prearrival_at TEXT,
    sent_review_at     TEXT,
    created_at         TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bookings_dates  ON bookings (check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);
-- Apply BEFORE deploying the new Functions. Existing bookings are preserved.
CREATE TABLE IF NOT EXISTS checkout_holds (
    id TEXT PRIMARY KEY,
    stripe_session_id TEXT UNIQUE,
    check_in TEXT NOT NULL,
    check_out TEXT NOT NULL,
    guests INTEGER NOT NULL CHECK (guests IN (1, 2)),
    amount_total INTEGER NOT NULL CHECK (amount_total > 0),
    lang TEXT NOT NULL DEFAULT 'it',
    origin TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released', 'converted')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_holds_dates ON checkout_holds(status, check_in, check_out);
CREATE TABLE IF NOT EXISTS booking_cancellations (
    stripe_session_id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS email_deliveries (
    delivery_key TEXT PRIMARY KEY,
    sent_at TEXT NOT NULL DEFAULT (datetime('now'))
);
