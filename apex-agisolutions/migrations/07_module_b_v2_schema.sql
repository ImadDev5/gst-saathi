-- Phase 2: Module B v2 — Parent-Child Entry Model
-- Replaces the flat retail_entries table with entries (parent) + entry_line_items (children)
-- Adds invoice attachments and audit logging

-- 1. Parent entries table
CREATE TABLE IF NOT EXISTS entries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_id          UUID NOT NULL REFERENCES trial_sessions(id) ON DELETE CASCADE,
  entry_type        TEXT NOT NULL CHECK (entry_type IN ('SALE', 'PURCHASE', 'SALE_RETURN', 'PURCHASE_RETURN')),
  entry_date        DATE NOT NULL,
  payment_mode      TEXT NOT NULL CHECK (payment_mode IN ('CASH', 'ONLINE', 'CREDIT')),
  customer_type     TEXT DEFAULT 'B2C' CHECK (customer_type IN ('B2C', 'B2B')),
  party_name        TEXT,
  party_gstin       VARCHAR(15),
  invoice_number    TEXT,
  has_invoice       BOOLEAN DEFAULT false,
  period_locked     BOOLEAN DEFAULT false,
  is_amendment      BOOLEAN DEFAULT false,
  original_entry_id UUID REFERENCES entries(id) ON DELETE SET NULL,
  remarks           TEXT,
  audit_log         JSONB DEFAULT '[]',
  deleted_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entries_trial ON entries(trial_id);
CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_entries_type ON entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_entries_deleted ON entries(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_entries_invoice ON entries(invoice_number, party_gstin) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_entries_period_locked ON entries(period_locked);
CREATE INDEX IF NOT EXISTS idx_entries_original ON entries(original_entry_id);

-- 2. Child line items table (one row per product per entry)
CREATE TABLE IF NOT EXISTS entry_line_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id              UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  product_id            UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name          TEXT NOT NULL,
  hsn_code              VARCHAR(8),
  quantity              NUMERIC(10,3) NOT NULL DEFAULT 1,
  unit                  TEXT DEFAULT 'pcs',
  amount_paise          INTEGER NOT NULL,      -- GST-inclusive: rate × qty as entered by user
  rate_paise            INTEGER NOT NULL,      -- GST-inclusive per-unit rate
  taxable_paise         INTEGER NOT NULL,      -- back-calculated: amount × 100 ÷ (100 + gst_rate)
  gst_rate              NUMERIC(4,2) NOT NULL,
  cgst_paise            INTEGER DEFAULT 0,
  sgst_paise            INTEGER DEFAULT 0,
  igst_paise            INTEGER DEFAULT 0,
  total_gst_paise       INTEGER DEFAULT 0,     -- cgst+sgst+igst
  total_paise            INTEGER NOT NULL,      -- = amount_paise (same, stored for clarity)
  itc_status            TEXT DEFAULT 'UNKNOWN' CHECK (itc_status IN ('ELIGIBLE', 'BLOCKED', 'RCM', 'NEEDS_INVOICE', 'TIME_BARRED', 'PERSONAL', 'UNKNOWN')),
  itc_amount_paise      INTEGER DEFAULT 0,
  block_reason          TEXT,
  force_override_reason TEXT,
  is_price_sensitive    BOOLEAN DEFAULT false,
  threshold_paise       INTEGER DEFAULT 100000,
  deleted_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eli_entry ON entry_line_items(entry_id);
CREATE INDEX IF NOT EXISTS idx_eli_product ON entry_line_items(product_id);
CREATE INDEX IF NOT EXISTS idx_eli_deleted ON entry_line_items(deleted_at) WHERE deleted_at IS NULL;

-- 3. Invoice/file attachments table
CREATE TABLE IF NOT EXISTS entry_attachments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id     UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  file_name    TEXT NOT NULL,
  file_size    INTEGER NOT NULL,
  mime_type    TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  storage_url  TEXT,                           -- signed URL, generated on read
  uploaded_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ea_entry ON entry_attachments(entry_id);

-- 4. Cross-entity audit log
CREATE TABLE IF NOT EXISTS audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_id     UUID REFERENCES trial_sessions(id) ON DELETE SET NULL,
  entity_type  TEXT NOT NULL CHECK (entity_type IN ('ENTRY', 'LINE_ITEM', 'ATTACHMENT', 'AMENDMENT')),
  entity_id    UUID NOT NULL,
  action       TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'OVERRIDE', 'AMENDMENT', 'PERIOD_LOCK')),
  field_name   TEXT,
  old_value    TEXT,
  new_value    TEXT,
  ip_address   INET,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_trial ON audit_logs(trial_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- 5. Migrate existing retail_entries data into new tables
-- Each retail_entries row becomes an entries row + an entry_line_items row
-- Grouped by (entry_date, entry_type, payment_mode, customer_type, party_gstin, invoice_number)

DO $$
DECLARE
  rec RECORD;
  new_entry_id UUID;
BEGIN
  -- Check if there's data to migrate
  IF EXISTS (SELECT 1 FROM retail_entries WHERE deleted_at IS NULL) THEN
    -- Create entries from retail_entries (one row = one entry)
    FOR rec IN
      SELECT
        id AS old_id,
        trial_id, entry_type, entry_date, payment_mode, customer_type,
        party_name, party_gstin, invoice_number,
        period_locked, remarks, deleted_at, created_at, updated_at
      FROM retail_entries
      WHERE deleted_at IS NULL
    LOOP
      INSERT INTO entries (
        trial_id, entry_type, entry_date, payment_mode, customer_type,
        party_name, party_gstin, invoice_number,
        has_invoice, period_locked, remarks, created_at, updated_at
      ) VALUES (
        rec.trial_id, rec.entry_type, rec.entry_date, rec.payment_mode, rec.customer_type,
        rec.party_name, rec.party_gstin, rec.invoice_number,
        false, rec.period_locked, rec.remarks, rec.created_at, rec.updated_at
      ) RETURNING id INTO new_entry_id;

      -- Create line item from each retail_entries row
      INSERT INTO entry_line_items (
        entry_id, product_id, product_name, hsn_code,
        quantity, unit, rate_paise, amount_paise,
        taxable_paise, gst_rate, cgst_paise, sgst_paise, igst_paise,
        total_gst_paise, total_paise,
        itc_status, itc_amount_paise,
        is_price_sensitive, threshold_paise, created_at
      )
      SELECT
        new_entry_id,
        re.product_id, re.product_name, re.hsn_code,
        re.quantity, re.unit,
        re.total_paise / GREATEST(re.quantity, 1),  -- approximate rate_paise from total
        re.total_paise,                              -- amount_paise = total_paise
        re.taxable_paise, re.gst_rate,
        re.cgst_paise, re.sgst_paise, re.igst_paise,
        re.cgst_paise + re.sgst_paise + re.igst_paise,  -- total_gst_paise
        re.total_paise,
        CASE WHEN re.itc_eligible THEN 'ELIGIBLE' ELSE 'UNKNOWN' END,
        CASE WHEN re.itc_eligible THEN (re.cgst_paise + re.sgst_paise + re.igst_paise) ELSE 0 END,
        false, 100000, re.created_at
      FROM retail_entries re
      WHERE re.id = rec.old_id;
    END LOOP;
  END IF;
END $$;
