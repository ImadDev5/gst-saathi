-- Phase 4: Admin Auth & Token Management Schema

-- 1. Admin Sessions (for admin dashboard access)
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);

-- 2. Add assigned_token column to contacts for quick lookup
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS assigned_token TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS token_assigned_at TIMESTAMPTZ;

-- 3. Contact-Tokens linking table (audit trail of token assignments)
CREATE TABLE IF NOT EXISTS contact_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  trial_session_id UUID REFERENCES trial_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_tokens_contact ON contact_tokens(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_tokens_trial ON contact_tokens(trial_session_id);
