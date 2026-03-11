-- Migration: Scoped Sessions & OAuth 2.1 for MCP Integration
-- This migration adds:
-- 1. New scope-based permission columns to session_keys
-- 2. OAuth 2.1 tables for MCP server integration

-- ============================================================================
-- Session Keys Updates
-- ============================================================================

-- Add new columns to session_keys table
ALTER TABLE session_keys
ADD COLUMN IF NOT EXISTS scopes jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS on_chain_params jsonb,
ADD COLUMN IF NOT EXISTS oauth_client_id varchar(100),
ADD COLUMN IF NOT EXISTS oauth_grant_id varchar(100);

-- Migrate existing sessions to new scope format
-- Convert legacy format to new scopes array with x402:payments scope
UPDATE session_keys
SET scopes = jsonb_build_array(
  jsonb_build_object(
    'id', 'x402:payments',
    'type', 'eip712',
    'name', 'x402 Payments',
    'description', 'Sign USDC transfer authorizations for x402 API payments',
    'budgetEnforceable', false,
    'approvedContracts', COALESCE(approved_contracts, '[]'::jsonb)
  )
),
on_chain_params = jsonb_build_object(
  'allowedTargets', COALESCE(allowed_targets, '[]'::jsonb),
  'allowedSelectors', COALESCE(allowed_selectors, '[]'::jsonb),
  'tokenLimits', COALESCE(token_limits, '[]'::jsonb),
  'approvedContracts', COALESCE(approved_contracts, '[]'::jsonb)
)
WHERE scopes IS NULL OR scopes = '[]'::jsonb;

-- ============================================================================
-- OAuth 2.1 Tables
-- ============================================================================

-- OAuth Clients (MCP servers)
CREATE TABLE IF NOT EXISTS oauth_clients (
  id varchar(100) PRIMARY KEY,
  secret_hash varchar(128) NOT NULL,
  name varchar(100) NOT NULL,
  description text,
  logo_url text,
  redirect_uris jsonb NOT NULL,
  allowed_scopes jsonb NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- OAuth Authorization Codes (short-lived, one-time use)
CREATE TABLE IF NOT EXISTS oauth_auth_codes (
  code varchar(128) PRIMARY KEY,
  client_id varchar(100) NOT NULL REFERENCES oauth_clients(id),
  user_id uuid NOT NULL REFERENCES users(id),
  requested_scopes jsonb NOT NULL,
  approved_scopes jsonb NOT NULL,
  session_config jsonb NOT NULL,
  code_challenge varchar(128) NOT NULL,
  code_challenge_method varchar(10) NOT NULL DEFAULT 'S256',
  redirect_uri text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

-- OAuth Access Tokens (bound to sessions)
CREATE TABLE IF NOT EXISTS oauth_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash varchar(128) NOT NULL UNIQUE,
  client_id varchar(100) NOT NULL REFERENCES oauth_clients(id),
  user_id uuid NOT NULL REFERENCES users(id),
  session_key_id uuid NOT NULL REFERENCES session_keys(id),
  scopes jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_oauth_auth_codes_expiry
ON oauth_auth_codes(expires_at)
WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_oauth_access_tokens_session
ON oauth_access_tokens(session_key_id);

CREATE INDEX IF NOT EXISTS idx_oauth_access_tokens_user
ON oauth_access_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_session_keys_oauth_client
ON session_keys(oauth_client_id)
WHERE oauth_client_id IS NOT NULL;
