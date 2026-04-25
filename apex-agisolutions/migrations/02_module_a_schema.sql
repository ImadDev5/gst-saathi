-- Phase 1A: Module A (Bank Statements) Schema

-- 1. Trial Sessions (for passwordless access)
CREATE TABLE IF NOT EXISTS trial_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'EXPIRED', 'CONVERTED')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Statements (Tracks uploaded CSV files)
CREATE TABLE IF NOT EXISTS statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_id UUID REFERENCES trial_sessions(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  bank_name TEXT NOT NULL CHECK(bank_name IN ('HDFC', 'ICICI', 'SBI', 'KOTAK', 'AXIS', 'OTHER')),
  status TEXT DEFAULT 'PROCESSING' CHECK(status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Transactions (Parsed from statements)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id UUID REFERENCES statements(id) ON DELETE CASCADE,
  trial_id UUID REFERENCES trial_sessions(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL, -- Stored in paise
  transaction_type TEXT NOT NULL CHECK(transaction_type IN ('CREDIT', 'DEBIT')),
  balance INTEGER, -- Stored in paise
  
  -- AI / Engine Classification Fields
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  mapped_vendor_name TEXT,
  itc_status TEXT DEFAULT 'UNKNOWN' CHECK(itc_status IN ('ELIGIBLE', 'BLOCKED', 'CONDITIONAL', 'RCM', 'UNKNOWN')),
  gst_amount INTEGER DEFAULT 0, -- Stored in paise
  block_reason TEXT,
  
  -- Deduplication Hash (session_id + date + amount + description)
  dedupe_hash TEXT UNIQUE NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_statements_trial ON statements(trial_id);
CREATE INDEX IF NOT EXISTS idx_transactions_statement ON transactions(statement_id);
CREATE INDEX IF NOT EXISTS idx_transactions_trial ON transactions(trial_id);
CREATE INDEX IF NOT EXISTS idx_trial_sessions_token ON trial_sessions(token);