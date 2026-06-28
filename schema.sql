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
    sent_prearrival_at TEXT,
    sent_review_at     TEXT,
    created_at         TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bookings_dates  ON bookings (check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);
