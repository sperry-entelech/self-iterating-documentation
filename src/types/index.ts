/**
 * Core Types for Context Version Control System
 * Defines the data structures for git-like versioning of business context
 */

export interface ContextVersion {
  id: string;
  user_id: string;
  version_hash: string;
  commit_message: string;
  created_at: Date;
  is_current: boolean;
  parent_version_id?: string;
  author?: string;
  tags?: string[];
}

export interface BusinessStateField {
  id: string;
  version_id: string;
  field_name: string;
  field_value: any;
  field_type: 'text' | 'number' | 'json' | 'array' | 'boolean' | 'date';
  source: 'manual' | 'api_twitter' | 'api_crm' | 'api_webhook' | 'claude_chat';
  updated_at: Date;
  metadata?: Record<string, any>;
}

export interface ContextChange {
  id: string;
  version_id: string;
  field_name: string;
  old_value: any;
  new_value: any;
  change_type: 'create' | 'update' | 'delete';
  source: string;
  created_at: Date;
}

export interface APISource {
  id: string;
  user_id: string;
  source_name: string;
  api_endpoint?: string;
  field_mappings: Record<string, string>;
  update_frequency: number; // seconds
  last_synced?: Date;
  is_active: boolean;
  credentials?: Record<string, string>;
}

export interface ContextDiff {
  version_from: string;
  version_to: string;
  changes: {
    field_name: string;
    old_value: any;
    new_value: any;
    change_type: 'added' | 'modified' | 'removed';
  }[];
  timestamp: Date;
}

export interface TemporalQuery {
  date?: Date;
  field_name?: string;
  time_range?: {
    start: Date;
    end: Date;
  };
}

export interface ClaudeContext {
  version_id: string;
  generated_at: Date;
  fields: Record<string, any>;
  formatted_content: string;
  format: 'markdown' | 'json' | 'yaml';
}

export interface CommitRequest {
  user_id: string;
  commit_message: string;
  changes: {
    field_name: string;
    field_value: any;
    field_type: BusinessStateField['field_type'];
    source: BusinessStateField['source'];
  }[];
  tags?: string[];
  author?: string;
}

export interface RollbackRequest {
  user_id: string;
  version_id: string;
  reason?: string;
}

export interface SyncResult {
  source: string;
  success: boolean;
  fields_updated: string[];
  changes_count: number;
  error?: string;
  timestamp: Date;
}

export interface BusinessState {
  version_id: string;
  version_hash: string;
  commit_message: string;
  created_at: Date;
  fields: Record<string, {
    value: any;
    type: string;
    source: string;
    updated_at: Date;
  }>;
}

// Entelech-specific business state fields
export interface EntelechBusinessContext {
  // Identity & Positioning
  icp: {
    target_customer: string;
    pain_points: string[];
    buying_triggers: string[];
  };
  positioning: {
    core_message: string;
    differentiators: string[];
    value_proposition: string;
  };

  // Metrics & Growth
  follower_count: {
    twitter: number;
    linkedin: number;
    total: number;
  };

  // Business Pipeline
  current_deals: {
    id: string;
    company: string;
    deal_size: number;
    stage: string;
    probability: number;
  }[];

  // Product Strategy
  current_focus: string;
  active_experiments: string[];
  recent_pivots: {
    date: Date;
    from: string;
    to: string;
    reason: string;
  }[];

  // Content & Marketing
  content_themes: string[];
  messaging_angles: string[];
  recent_wins: string[];
}

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  TWITTER_BEARER_TOKEN: string;
  CLAUDE_API_KEY: string;
  CONTEXT_CACHE?: KVNamespace; // Optional - caching is done via Supabase
  ENVIRONMENT: string;
}
