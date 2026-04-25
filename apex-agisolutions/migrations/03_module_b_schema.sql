-- Phase 1D: Module B (Retail Daily Ledger) Schema

-- 1. Products table (product master)
CREATE TABLE IF NOT EXISTS products (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_id            UUID REFERENCES trial_sessions(id) ON DELETE CASCADE,
  product_name        TEXT NOT NULL,
  hsn_sac_code        VARCHAR(8),
  default_gst_rate    NUMERIC(4,2) NOT NULL DEFAULT 18,
  unit                TEXT DEFAULT 'pcs',
  default_sale_rate   INTEGER,        -- paise
  default_purchase_rate INTEGER,      -- paise
  is_price_sensitive  BOOLEAN DEFAULT false,
  threshold_paise     INTEGER DEFAULT 100000, -- ₹1,000 in paise
  category            TEXT,
  is_preloaded        BOOLEAN DEFAULT false,
  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_trial ON products(trial_id);

-- 2. Retail entries table (daily ledger)
CREATE TABLE IF NOT EXISTS retail_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_id        UUID REFERENCES trial_sessions(id) ON DELETE CASCADE,
  entry_type      TEXT NOT NULL CHECK(entry_type IN ('SALE', 'PURCHASE', 'SALE_RETURN', 'PURCHASE_RETURN')),
  entry_date      DATE NOT NULL,
  payment_mode    TEXT NOT NULL CHECK(payment_mode IN ('CASH', 'ONLINE', 'CREDIT')),
  customer_type   TEXT DEFAULT 'B2C' CHECK(customer_type IN ('B2C', 'B2B')),
  party_name      TEXT,
  party_gstin     VARCHAR(15),
  invoice_number  TEXT,
  product_id      UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name    TEXT NOT NULL,
  hsn_code        VARCHAR(8),
  quantity        NUMERIC(10,3) NOT NULL DEFAULT 1,
  unit            TEXT DEFAULT 'pcs',
  rate_paise      INTEGER NOT NULL,     -- per unit excl GST
  taxable_paise   INTEGER NOT NULL,     -- quantity * rate
  gst_rate        NUMERIC(4,2) NOT NULL,
  cgst_paise      INTEGER DEFAULT 0,
  sgst_paise      INTEGER DEFAULT 0,
  igst_paise      INTEGER DEFAULT 0,
  total_paise     INTEGER NOT NULL,
  itc_eligible    BOOLEAN DEFAULT false, -- purchases only
  period_locked   BOOLEAN DEFAULT false, -- true after GSTR-3B filed
  remarks         TEXT,
  deleted_at      TIMESTAMPTZ,           -- soft delete
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_re_trial ON retail_entries(trial_id);
CREATE INDEX IF NOT EXISTS idx_re_date ON retail_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_re_type ON retail_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_re_deleted ON retail_entries(deleted_at) WHERE deleted_at IS NULL;

-- 3. Filing periods table
CREATE TABLE IF NOT EXISTS filing_periods (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_id        UUID REFERENCES trial_sessions(id) ON DELETE CASCADE,
  period_month    INTEGER NOT NULL CHECK(period_month BETWEEN 1 AND 12),
  period_year     INTEGER NOT NULL,
  status          TEXT DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'GENERATED', 'FILED', 'AMENDED')),
  filed_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trial_id, period_month, period_year)
);

-- 4. Reports table (for both Module A and B reports)
CREATE TABLE IF NOT EXISTS reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_id        UUID REFERENCES trial_sessions(id) ON DELETE CASCADE,
  report_type     TEXT NOT NULL,
  status          TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'COMPLETED', 'FAILED')),
  summary_json    JSONB,
  storage_path    TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_trial ON reports(trial_id);
