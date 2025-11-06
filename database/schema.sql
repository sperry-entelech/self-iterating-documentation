-- ============================================================================
-- CONTEXT VERSION CONTROL DATABASE SCHEMA
-- Git for Business Context - Version control for high-velocity operations
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy search

-- ============================================================================
-- CORE VERSION CONTROL TABLES
-- ============================================================================

-- Context Versions (Git commits for business state)
CREATE TABLE context_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  version_hash VARCHAR(40) NOT NULL UNIQUE,
  commit_message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_current BOOLEAN DEFAULT FALSE,
  parent_version_id UUID REFERENCES context_versions(id),
  author VARCHAR(255),
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  -- Indexes for performance
  CONSTRAINT unique_current_per_user UNIQUE (user_id, is_current) WHERE is_current = true
);

CREATE INDEX idx_context_versions_user_id ON context_versions(user_id);
CREATE INDEX idx_context_versions_created_at ON context_versions(created_at DESC);
CREATE INDEX idx_context_versions_hash ON context_versions(version_hash);
CREATE INDEX idx_context_versions_current ON context_versions(user_id, is_current) WHERE is_current = true;
CREATE INDEX idx_context_versions_tags ON context_versions USING GIN(tags);

-- Business State Fields (Versioned data storage)
CREATE TABLE business_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_id UUID NOT NULL REFERENCES context_versions(id) ON DELETE CASCADE,
  field_name VARCHAR(100) NOT NULL,
  field_value JSONB NOT NULL,
  field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('text', 'number', 'json', 'array', 'boolean', 'date')),
  source VARCHAR(100) NOT NULL CHECK (source IN ('manual', 'api_twitter', 'api_crm', 'api_webhook', 'claude_chat')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',

  CONSTRAINT unique_field_per_version UNIQUE (version_id, field_name)
);

CREATE INDEX idx_business_state_version_id ON business_state(version_id);
CREATE INDEX idx_business_state_field_name ON business_state(field_name);
CREATE INDEX idx_business_state_updated_at ON business_state(updated_at DESC);
CREATE INDEX idx_business_state_source ON business_state(source);
CREATE INDEX idx_business_state_value ON business_state USING GIN(field_value);

-- Change Log (Audit trail for all modifications)
CREATE TABLE context_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_id UUID NOT NULL REFERENCES context_versions(id) ON DELETE CASCADE,
  field_name VARCHAR(100) NOT NULL,
  old_value JSONB,
  new_value JSONB,
  change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('create', 'update', 'delete')),
  source VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_context_changes_version_id ON context_changes(version_id);
CREATE INDEX idx_context_changes_field_name ON context_changes(field_name);
CREATE INDEX idx_context_changes_created_at ON context_changes(created_at DESC);
CREATE INDEX idx_context_changes_change_type ON context_changes(change_type);

-- ============================================================================
-- API INTEGRATION TABLES
-- ============================================================================

-- API Sources (External data integration configuration)
CREATE TABLE api_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  source_name VARCHAR(100) NOT NULL,
  api_endpoint TEXT,
  field_mappings JSONB NOT NULL DEFAULT '{}',
  update_frequency INTEGER DEFAULT 3600 CHECK (update_frequency >= 60), -- minimum 1 minute
  last_synced TIMESTAMP WITH TIME ZONE,
  next_sync TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  credentials JSONB DEFAULT '{}', -- Encrypted credentials
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_source_per_user UNIQUE (user_id, source_name)
);

CREATE INDEX idx_api_sources_user_id ON api_sources(user_id);
CREATE INDEX idx_api_sources_active ON api_sources(is_active) WHERE is_active = true;
CREATE INDEX idx_api_sources_next_sync ON api_sources(next_sync) WHERE is_active = true;

-- Sync History (Track API synchronization results)
CREATE TABLE sync_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_source_id UUID NOT NULL REFERENCES api_sources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  version_id UUID REFERENCES context_versions(id),
  success BOOLEAN NOT NULL,
  fields_updated TEXT[] DEFAULT '{}',
  changes_count INTEGER DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_sync_history_source_id ON sync_history(api_source_id);
CREATE INDEX idx_sync_history_user_id ON sync_history(user_id);
CREATE INDEX idx_sync_history_synced_at ON sync_history(synced_at DESC);
CREATE INDEX idx_sync_history_success ON sync_history(success);

-- ============================================================================
-- CLAUDE INTEGRATION TABLES
-- ============================================================================

-- Claude Context Cache (Pre-generated context for Claude API)
CREATE TABLE claude_context_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  version_id UUID NOT NULL REFERENCES context_versions(id) ON DELETE CASCADE,
  format VARCHAR(20) NOT NULL CHECK (format IN ('markdown', 'json', 'yaml')),
  content TEXT NOT NULL,
  fields_included TEXT[] NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  access_count INTEGER DEFAULT 0,

  CONSTRAINT unique_cache_per_version_format UNIQUE (version_id, format)
);

CREATE INDEX idx_claude_cache_user_id ON claude_context_cache(user_id);
CREATE INDEX idx_claude_cache_version_id ON claude_context_cache(version_id);
CREATE INDEX idx_claude_cache_expires_at ON claude_context_cache(expires_at);

-- Claude Conversation Tracking (Link conversations to context updates)
CREATE TABLE claude_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  conversation_id VARCHAR(255) NOT NULL,
  version_before UUID REFERENCES context_versions(id),
  version_after UUID REFERENCES context_versions(id),
  changes_extracted JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  message_count INTEGER DEFAULT 0,

  CONSTRAINT unique_conversation UNIQUE (user_id, conversation_id)
);

CREATE INDEX idx_claude_conversations_user_id ON claude_conversations(user_id);
CREATE INDEX idx_claude_conversations_started_at ON claude_conversations(started_at DESC);

-- ============================================================================
-- UTILITY TABLES
-- ============================================================================

-- Field Definitions (Schema for business state fields)
CREATE TABLE field_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  field_name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  field_type VARCHAR(50) NOT NULL,
  default_source VARCHAR(100),
  validation_rules JSONB DEFAULT '{}',
  is_system_field BOOLEAN DEFAULT FALSE,
  is_required BOOLEAN DEFAULT FALSE,
  category VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_field_definitions_category ON field_definitions(category);
CREATE INDEX idx_field_definitions_system ON field_definitions(is_system_field);

-- User Settings (Per-user configuration)
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE,
  auto_commit_enabled BOOLEAN DEFAULT FALSE,
  auto_commit_threshold JSONB DEFAULT '{}',
  notification_preferences JSONB DEFAULT '{}',
  default_fields TEXT[] DEFAULT '{}',
  timezone VARCHAR(50) DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to generate version hash (SHA1-like hash)
CREATE OR REPLACE FUNCTION generate_version_hash(
  p_user_id UUID,
  p_commit_message TEXT,
  p_timestamp TIMESTAMP WITH TIME ZONE
) RETURNS VARCHAR(40) AS $$
BEGIN
  RETURN encode(
    digest(
      p_user_id::TEXT || p_commit_message || p_timestamp::TEXT,
      'sha1'
    ),
    'hex'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get business state at specific timestamp
CREATE OR REPLACE FUNCTION get_business_state_at(
  p_user_id UUID,
  p_timestamp TIMESTAMP WITH TIME ZONE
) RETURNS TABLE (
  field_name VARCHAR(100),
  field_value JSONB,
  field_type VARCHAR(50),
  source VARCHAR(100),
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (bs.field_name)
    bs.field_name,
    bs.field_value,
    bs.field_type,
    bs.source,
    bs.updated_at
  FROM business_state bs
  INNER JOIN context_versions cv ON bs.version_id = cv.id
  WHERE cv.user_id = p_user_id
    AND cv.created_at <= p_timestamp
  ORDER BY bs.field_name, cv.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate diff between two versions
CREATE OR REPLACE FUNCTION calculate_version_diff(
  p_version_from UUID,
  p_version_to UUID
) RETURNS TABLE (
  field_name VARCHAR(100),
  old_value JSONB,
  new_value JSONB,
  change_type VARCHAR(20)
) AS $$
BEGIN
  RETURN QUERY
  WITH
  from_state AS (
    SELECT field_name, field_value
    FROM business_state
    WHERE version_id = p_version_from
  ),
  to_state AS (
    SELECT field_name, field_value
    FROM business_state
    WHERE version_id = p_version_to
  )
  SELECT
    COALESCE(f.field_name, t.field_name) as field_name,
    f.field_value as old_value,
    t.field_value as new_value,
    CASE
      WHEN f.field_name IS NULL THEN 'added'::VARCHAR(20)
      WHEN t.field_name IS NULL THEN 'removed'::VARCHAR(20)
      WHEN f.field_value != t.field_value THEN 'modified'::VARCHAR(20)
      ELSE 'unchanged'::VARCHAR(20)
    END as change_type
  FROM from_state f
  FULL OUTER JOIN to_state t ON f.field_name = t.field_name
  WHERE f.field_value IS DISTINCT FROM t.field_value;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update next_sync time when api_sources is updated
CREATE OR REPLACE FUNCTION update_next_sync()
RETURNS TRIGGER AS $$
BEGIN
  NEW.next_sync = NOW() + (NEW.update_frequency || ' seconds')::INTERVAL;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_next_sync
  BEFORE INSERT OR UPDATE OF update_frequency ON api_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_next_sync();

-- Trigger to ensure only one current version per user
CREATE OR REPLACE FUNCTION enforce_single_current_version()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = true THEN
    UPDATE context_versions
    SET is_current = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_current = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_single_current_version
  BEFORE INSERT OR UPDATE OF is_current ON context_versions
  FOR EACH ROW
  WHEN (NEW.is_current = true)
  EXECUTE FUNCTION enforce_single_current_version();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Current business state for all users
CREATE OR REPLACE VIEW current_business_state AS
SELECT
  cv.user_id,
  cv.id as version_id,
  cv.version_hash,
  cv.commit_message,
  cv.created_at,
  bs.field_name,
  bs.field_value,
  bs.field_type,
  bs.source,
  bs.updated_at
FROM context_versions cv
INNER JOIN business_state bs ON cv.id = bs.version_id
WHERE cv.is_current = true;

-- Version history with change counts
CREATE OR REPLACE VIEW version_history_summary AS
SELECT
  cv.id,
  cv.user_id,
  cv.version_hash,
  cv.commit_message,
  cv.created_at,
  cv.author,
  cv.tags,
  COUNT(DISTINCT cc.id) as change_count,
  ARRAY_AGG(DISTINCT cc.field_name) as changed_fields
FROM context_versions cv
LEFT JOIN context_changes cc ON cv.id = cc.version_id
GROUP BY cv.id, cv.user_id, cv.version_hash, cv.commit_message, cv.created_at, cv.author, cv.tags
ORDER BY cv.created_at DESC;

-- Active API sources needing sync
CREATE OR REPLACE VIEW pending_syncs AS
SELECT
  id,
  user_id,
  source_name,
  next_sync,
  last_synced,
  error_count
FROM api_sources
WHERE is_active = true
  AND (next_sync IS NULL OR next_sync <= NOW())
ORDER BY next_sync ASC NULLS FIRST;

-- ============================================================================
-- SEED DATA FOR FIELD DEFINITIONS
-- ============================================================================

INSERT INTO field_definitions (field_name, display_name, description, field_type, category, is_system_field) VALUES
  ('icp', 'Ideal Customer Profile', 'Target customer definition and characteristics', 'json', 'identity', false),
  ('positioning', 'Market Positioning', 'Core positioning and value proposition', 'json', 'identity', false),
  ('follower_count', 'Social Media Followers', 'Follower counts across platforms', 'json', 'metrics', false),
  ('current_deals', 'Active Deals', 'Current sales pipeline and opportunities', 'array', 'business', false),
  ('current_focus', 'Strategic Focus', 'Current business focus and priorities', 'text', 'strategy', false),
  ('active_experiments', 'Active Experiments', 'Running experiments and tests', 'array', 'strategy', false),
  ('recent_pivots', 'Recent Pivots', 'History of strategic pivots', 'array', 'strategy', false),
  ('content_themes', 'Content Themes', 'Active content and messaging themes', 'array', 'marketing', false),
  ('messaging_angles', 'Messaging Angles', 'Marketing message variations', 'array', 'marketing', false),
  ('recent_wins', 'Recent Wins', 'Latest successes and achievements', 'array', 'metrics', false)
ON CONFLICT (field_name) DO NOTHING;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE context_versions IS 'Git-like commits for business context state';
COMMENT ON TABLE business_state IS 'Versioned storage of business state fields';
COMMENT ON TABLE context_changes IS 'Audit trail of all context modifications';
COMMENT ON TABLE api_sources IS 'External API integration configurations';
COMMENT ON TABLE sync_history IS 'History of API synchronization operations';
COMMENT ON TABLE claude_context_cache IS 'Pre-generated context for Claude API calls';
COMMENT ON TABLE field_definitions IS 'Schema and metadata for business state fields';

COMMENT ON FUNCTION get_business_state_at IS 'Retrieve complete business state at any point in time';
COMMENT ON FUNCTION calculate_version_diff IS 'Calculate differences between two context versions';
