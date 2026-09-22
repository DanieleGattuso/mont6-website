-- Apply before deploying versioned Checkout terms. Existing holds keep NULL,
-- preserving their original Stripe idempotency parameters and cancellation terms.
-- First inspect PRAGMA table_info(checkout_holds). Run this migration once only
-- if terms_version is absent; fresh databases created by schema.sql already have it.
-- npx wrangler d1 execute mont6-bookings --remote --file=./migrations/0002_booking_terms.sql
ALTER TABLE checkout_holds ADD COLUMN terms_version TEXT;
