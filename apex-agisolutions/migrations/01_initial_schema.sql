-- Enable pgcrypto for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Users Table (will link to Auth in Phase 3)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE, -- Phase 3 Supabase Auth hook
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'USER' CHECK(role IN ('OWNER', 'EMPLOYEE', 'CA_VIEWER', 'USER')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Contacts Table (for initial MVP waitlist / contact forms)
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  business_name TEXT NOT NULL,
  gstin TEXT,
  status TEXT DEFAULT 'NEW' CHECK(status IN ('NEW', 'ASSIGNED', 'CONTACTED', 'ONBOARDED', 'REJECTED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Vendors Table (Master rules table for Phase 1 auto-classification Engine)
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  default_gst_rate INTEGER DEFAULT 18,
  hsn_sac_code TEXT,
  is_oidar BOOLEAN DEFAULT FALSE,
  itc_status TEXT DEFAULT 'UNKNOWN' CHECK(itc_status IN ('ELIGIBLE', 'BLOCKED', 'RCM', 'CONDITIONAL', 'UNKNOWN')),
  block_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initial indexing
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_vendors_keywords ON vendors USING GIN (keywords);