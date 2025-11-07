/**
 * Core Version Control Engine
 * Git-like versioning system for business context
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'node:crypto';
import {
  ContextVersion,
  BusinessStateField,
  ContextChange,
  CommitRequest,
  RollbackRequest,
  BusinessState,
  ContextDiff,
  Env
} from '../types';

export class VersionControlEngine {
  private supabase: SupabaseClient;
  private userId: string;

  constructor(env: Env, userId: string) {
    this.supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
    this.userId = userId;
  }

  /**
   * Create a new context version (like git commit)
   * This is the core operation that captures business state changes
   */
  async commit(request: CommitRequest): Promise<ContextVersion> {
    const startTime = Date.now();

    try {
      // 1. Get current version to set as parent
      const currentVersion = await this.getCurrentVersion();

      // 2. Generate version hash
      const timestamp = new Date();
      const versionHash = this.generateVersionHash(
        request.user_id,
        request.commit_message,
        timestamp
      );

      // 3. Create new version record
      const { data: newVersion, error: versionError } = await this.supabase
        .from('context_versions')
        .insert({
          user_id: request.user_id,
          version_hash: versionHash,
          commit_message: request.commit_message,
          parent_version_id: currentVersion?.id,
          author: request.author || 'system',
          tags: request.tags || [],
          is_current: true
        })
        .select()
        .single();

      if (versionError) throw new Error(`Failed to create version: ${versionError.message}`);

      // 4. Get previous state for change detection
      const previousState = currentVersion
        ? await this.getVersionState(currentVersion.id)
        : {};

      // 5. Insert new business state fields
      const stateRecords = request.changes.map(change => ({
        version_id: newVersion.id,
        field_name: change.field_name,
        field_value: change.field_value,
        field_type: change.field_type,
        source: change.source,
        updated_at: timestamp
      }));

      // Copy unchanged fields from previous version
      if (currentVersion) {
        const { data: previousFields } = await this.supabase
          .from('business_state')
          .select('*')
          .eq('version_id', currentVersion.id);

        const changedFieldNames = new Set(request.changes.map(c => c.field_name));
        const unchangedFields = (previousFields || [])
          .filter(field => !changedFieldNames.has(field.field_name))
          .map(field => ({
            version_id: newVersion.id,
            field_name: field.field_name,
            field_value: field.field_value,
            field_type: field.field_type,
            source: field.source,
            updated_at: field.updated_at
          }));

        stateRecords.push(...unchangedFields);
      }

      const { error: stateError } = await this.supabase
        .from('business_state')
        .insert(stateRecords);

      if (stateError) throw new Error(`Failed to insert state: ${stateError.message}`);

      // 6. Log changes for audit trail
      const changeRecords: Partial<ContextChange>[] = request.changes.map(change => ({
        version_id: newVersion.id,
        field_name: change.field_name,
        old_value: previousState[change.field_name]?.field_value || null,
        new_value: change.field_value,
        change_type: previousState[change.field_name] ? 'update' : 'create',
        source: change.source,
        created_at: timestamp
      }));

      if (changeRecords.length > 0) {
        const { error: changesError } = await this.supabase
          .from('context_changes')
          .insert(changeRecords);

        if (changesError) throw new Error(`Failed to log changes: ${changesError.message}`);
      }

      console.log(`✓ Commit ${versionHash.substring(0, 7)} created in ${Date.now() - startTime}ms`);
      console.log(`  Changes: ${changeRecords.length} fields updated`);
      console.log(`  Message: "${request.commit_message}"`);

      return newVersion as ContextVersion;

    } catch (error) {
      console.error('Commit failed:', error);
      throw error;
    }
  }

  /**
   * Get the current (HEAD) version for a user
   */
  async getCurrentVersion(): Promise<ContextVersion | null> {
    const { data, error } = await this.supabase
      .from('context_versions')
      .select('*')
      .eq('user_id', this.userId)
      .eq('is_current', true)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Failed to get current version: ${error.message}`);
    }

    return data as ContextVersion | null;
  }

  /**
   * Get complete business state for a specific version
   */
  async getVersionState(versionId: string): Promise<Record<string, BusinessStateField>> {
    const { data, error } = await this.supabase
      .from('business_state')
      .select('*')
      .eq('version_id', versionId);

    if (error) throw new Error(`Failed to get version state: ${error.message}`);

    const state: Record<string, BusinessStateField> = {};
    (data || []).forEach(field => {
      state[field.field_name] = field as BusinessStateField;
    });

    return state;
  }

  /**
   * Get business state at a specific point in time (temporal query)
   */
  async getStateAtTime(timestamp: Date): Promise<BusinessState | null> {
    // Find the most recent version before the timestamp
    const { data: version, error: versionError } = await this.supabase
      .from('context_versions')
      .select('*')
      .eq('user_id', this.userId)
      .lte('created_at', timestamp.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (versionError && versionError.code !== 'PGRST116') {
      throw new Error(`Failed to find version at time: ${versionError.message}`);
    }

    if (!version) return null;

    // Get the state for that version
    const state = await this.getVersionState(version.id);

    return {
      version_id: version.id,
      version_hash: version.version_hash,
      commit_message: version.commit_message,
      created_at: new Date(version.created_at),
      fields: Object.entries(state).reduce((acc, [name, field]) => {
        acc[name] = {
          value: field.field_value,
          type: field.field_type,
          source: field.source,
          updated_at: new Date(field.updated_at)
        };
        return acc;
      }, {} as Record<string, any>)
    };
  }

  /**
   * Get version history for a user
   */
  async getHistory(limit: number = 50, offset: number = 0): Promise<ContextVersion[]> {
    const { data, error } = await this.supabase
      .from('context_versions')
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`Failed to get history: ${error.message}`);

    return (data || []) as ContextVersion[];
  }

  /**
   * Get changes for a specific field over time
   */
  async getFieldHistory(
    fieldName: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<ContextChange[]> {
    let query = this.supabase
      .from('context_changes')
      .select(`
        *,
        context_versions!inner(user_id, created_at, commit_message)
      `)
      .eq('context_versions.user_id', this.userId)
      .eq('field_name', fieldName)
      .order('created_at', { ascending: false });

    if (timeRange) {
      query = query
        .gte('created_at', timeRange.start.toISOString())
        .lte('created_at', timeRange.end.toISOString());
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get field history: ${error.message}`);

    return (data || []) as ContextChange[];
  }

  /**
   * Calculate diff between two versions
   */
  async diff(versionFromId: string, versionToId: string): Promise<ContextDiff> {
    const { data, error } = await this.supabase
      .rpc('calculate_version_diff', {
        p_version_from: versionFromId,
        p_version_to: versionToId
      });

    if (error) throw new Error(`Failed to calculate diff: ${error.message}`);

    // Validate versions exist (unused but kept for validation)
    await this.getVersionById(versionFromId);
    await this.getVersionById(versionToId);

    return {
      version_from: versionFromId,
      version_to: versionToId,
      changes: (data || []).map((row: any) => ({
        field_name: row.field_name,
        old_value: row.old_value,
        new_value: row.new_value,
        change_type: row.change_type
      })),
      timestamp: new Date()
    };
  }

  /**
   * Rollback to a previous version
   */
  async rollback(request: RollbackRequest): Promise<ContextVersion> {
    // Get the target version
    const targetVersion = await this.getVersionById(request.version_id);
    if (!targetVersion) {
      throw new Error(`Version ${request.version_id} not found`);
    }

    // Get the state from target version
    const targetState = await this.getVersionState(request.version_id);

    // Create a new commit with the rolled-back state
    const changes = Object.values(targetState).map(field => ({
      field_name: field.field_name,
      field_value: field.field_value,
      field_type: field.field_type,
      source: 'manual' as const
    }));

    const rollbackMessage = `Rollback to ${targetVersion.version_hash.substring(0, 7)}: ${
      request.reason || targetVersion.commit_message
    }`;

    return this.commit({
      user_id: request.user_id,
      commit_message: rollbackMessage,
      changes,
      tags: ['rollback'],
      author: 'system'
    });
  }

  /**
   * Tag a version (like git tag)
   */
  async tagVersion(versionId: string, tags: string[]): Promise<void> {
    const { error } = await this.supabase
      .from('context_versions')
      .update({ tags })
      .eq('id', versionId);

    if (error) throw new Error(`Failed to tag version: ${error.message}`);
  }

  /**
   * Get version by ID
   */
  private async getVersionById(versionId: string): Promise<ContextVersion | null> {
    const { data, error } = await this.supabase
      .from('context_versions')
      .select('*')
      .eq('id', versionId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get version: ${error.message}`);
    }

    return data as ContextVersion | null;
  }

  /**
   * Generate a hash for a version (like git SHA)
   */
  private generateVersionHash(
    userId: string,
    commitMessage: string,
    timestamp: Date
  ): string {
    const content = `${userId}${commitMessage}${timestamp.toISOString()}${Math.random()}`;
    return crypto.createHash('sha1').update(content).digest('hex');
  }

  /**
   * Search versions by commit message or tags
   */
  async searchVersions(query: string, limit: number = 20): Promise<ContextVersion[]> {
    const { data, error } = await this.supabase
      .from('context_versions')
      .select('*')
      .eq('user_id', this.userId)
      .or(`commit_message.ilike.%${query}%,tags.cs.{${query}}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to search versions: ${error.message}`);

    return (data || []) as ContextVersion[];
  }

  /**
   * Get statistics about version history
   */
  async getStats(): Promise<{
    total_versions: number;
    total_changes: number;
    most_changed_fields: { field_name: string; change_count: number }[];
    recent_activity: { date: string; commit_count: number }[];
  }> {
    const { data: versions, error: vError } = await this.supabase
      .from('context_versions')
      .select('id, created_at', { count: 'exact' })
      .eq('user_id', this.userId);

    const { data: changes, error: cError } = await this.supabase
      .from('context_changes')
      .select('field_name, created_at', { count: 'exact' })
      .in('version_id', (versions || []).map(v => v.id));

    if (vError || cError) {
      throw new Error('Failed to get stats');
    }

    // Calculate most changed fields
    const fieldChangeCounts: Record<string, number> = {};
    (changes || []).forEach(change => {
      fieldChangeCounts[change.field_name] = (fieldChangeCounts[change.field_name] || 0) + 1;
    });

    const mostChangedFields = Object.entries(fieldChangeCounts)
      .map(([field_name, change_count]) => ({ field_name, change_count }))
      .sort((a, b) => b.change_count - a.change_count)
      .slice(0, 10);

    // Calculate recent activity (last 30 days)
    const recentActivity: Record<string, number> = {};
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    (versions || [])
      .filter(v => new Date(v.created_at) >= thirtyDaysAgo)
      .forEach(v => {
        const date = new Date(v.created_at).toISOString().split('T')[0];
        recentActivity[date] = (recentActivity[date] || 0) + 1;
      });

    return {
      total_versions: versions?.length || 0,
      total_changes: changes?.length || 0,
      most_changed_fields: mostChangedFields,
      recent_activity: Object.entries(recentActivity)
        .map(([date, commit_count]) => ({ date, commit_count }))
        .sort((a, b) => a.date.localeCompare(b.date))
    };
  }
}
