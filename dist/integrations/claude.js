/**
 * Claude Integration
 * Generates dynamic context for Claude API and extracts changes from conversations
 */
import { createClient } from '@supabase/supabase-js';
export class ClaudeContextGenerator {
    constructor(env) {
        this.supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
    }
    /**
     * Generate Claude-optimized context from current business state
     */
    async generateContext(userId, options = {}) {
        const format = options.format || 'markdown';
        // Get current version
        const { data: currentVersion, error: vError } = await this.supabase
            .from('context_versions')
            .select('*')
            .eq('user_id', userId)
            .eq('is_current', true)
            .single();
        if (vError || !currentVersion) {
            throw new Error('No current context version found');
        }
        // Get business state
        const { data: stateFields, error: sError } = await this.supabase
            .from('business_state')
            .select('*')
            .eq('version_id', currentVersion.id);
        if (sError) {
            throw new Error(`Failed to get business state: ${sError.message}`);
        }
        // Filter fields if specified
        let fields = stateFields || [];
        if (options.includeFields && options.includeFields.length > 0) {
            fields = fields.filter(f => options.includeFields.includes(f.field_name));
        }
        // Exclude outdated fields if requested
        if (options.excludeOutdated && options.maxAge) {
            const cutoffTime = new Date();
            cutoffTime.setHours(cutoffTime.getHours() - options.maxAge);
            fields = fields.filter(f => new Date(f.updated_at) >= cutoffTime);
        }
        // Build field map
        const fieldMap = {};
        fields.forEach(field => {
            fieldMap[field.field_name] = field.field_value;
        });
        // Format content
        let formattedContent;
        switch (format) {
            case 'json':
                formattedContent = this.formatAsJson(fieldMap, currentVersion);
                break;
            case 'yaml':
                formattedContent = this.formatAsYaml(fieldMap, currentVersion);
                break;
            case 'markdown':
            default:
                formattedContent = this.formatAsMarkdown(fieldMap, currentVersion);
                break;
        }
        // Cache the generated context
        await this.cacheContext(userId, currentVersion.id, format, formattedContent, Object.keys(fieldMap));
        return {
            version_id: currentVersion.id,
            generated_at: new Date(),
            fields: fieldMap,
            formatted_content: formattedContent,
            format
        };
    }
    /**
     * Format context as Markdown (best for Claude)
     */
    formatAsMarkdown(fields, version) {
        const lines = [];
        lines.push('# Business Context');
        lines.push('');
        lines.push(`**Last Updated:** ${new Date(version.created_at).toLocaleString()}`);
        lines.push(`**Version:** ${version.version_hash.substring(0, 7)}`);
        lines.push(`**Message:** ${version.commit_message}`);
        lines.push('');
        lines.push('---');
        lines.push('');
        // Group fields by category
        const categorized = this.categorizeFields(fields);
        for (const [category, categoryFields] of Object.entries(categorized)) {
            lines.push(`## ${category}`);
            lines.push('');
            for (const [fieldName, fieldValue] of Object.entries(categoryFields)) {
                const displayName = this.toDisplayName(fieldName);
                lines.push(`### ${displayName}`);
                lines.push('');
                lines.push(this.formatValue(fieldValue));
                lines.push('');
            }
        }
        lines.push('---');
        lines.push('');
        lines.push('*This context is dynamically generated and version-controlled. It represents the current business state and will be automatically updated as changes occur.*');
        return lines.join('\n');
    }
    /**
     * Format context as JSON
     */
    formatAsJson(fields, version) {
        return JSON.stringify({
            metadata: {
                version_id: version.id,
                version_hash: version.version_hash,
                commit_message: version.commit_message,
                created_at: version.created_at,
                generated_at: new Date().toISOString()
            },
            business_context: fields
        }, null, 2);
    }
    /**
     * Format context as YAML
     */
    formatAsYaml(fields, version) {
        const lines = [];
        lines.push('metadata:');
        lines.push(`  version_hash: ${version.version_hash}`);
        lines.push(`  commit_message: "${version.commit_message}"`);
        lines.push(`  created_at: ${version.created_at}`);
        lines.push('');
        lines.push('business_context:');
        for (const [key, value] of Object.entries(fields)) {
            lines.push(`  ${key}:`);
            const yamlValue = this.toYamlValue(value, 4);
            lines.push(yamlValue);
        }
        return lines.join('\n');
    }
    /**
     * Convert value to YAML format
     */
    toYamlValue(value, indent) {
        const spaces = ' '.repeat(indent);
        if (typeof value === 'object' && value !== null) {
            if (Array.isArray(value)) {
                return value.map(item => `${spaces}- ${JSON.stringify(item)}`).join('\n');
            }
            else {
                return Object.entries(value)
                    .map(([k, v]) => `${spaces}${k}: ${JSON.stringify(v)}`)
                    .join('\n');
            }
        }
        return `${spaces}${JSON.stringify(value)}`;
    }
    /**
     * Format a field value for display
     */
    formatValue(value) {
        if (typeof value === 'object' && value !== null) {
            if (Array.isArray(value)) {
                return value.map(item => `- ${this.formatValue(item)}`).join('\n');
            }
            else {
                return '```json\n' + JSON.stringify(value, null, 2) + '\n```';
            }
        }
        return String(value);
    }
    /**
     * Categorize fields by business function
     */
    categorizeFields(fields) {
        const categories = {
            'Identity & Positioning': {},
            'Metrics & Growth': {},
            'Business Pipeline': {},
            'Strategy & Focus': {},
            'Marketing & Content': {},
            'Other': {}
        };
        const categoryMap = {
            'icp': 'Identity & Positioning',
            'positioning': 'Identity & Positioning',
            'follower_count': 'Metrics & Growth',
            'twitter_follower_count': 'Metrics & Growth',
            'linkedin_follower_count': 'Metrics & Growth',
            'current_deals': 'Business Pipeline',
            'deal_pipeline': 'Business Pipeline',
            'current_focus': 'Strategy & Focus',
            'active_experiments': 'Strategy & Focus',
            'recent_pivots': 'Strategy & Focus',
            'content_themes': 'Marketing & Content',
            'messaging_angles': 'Marketing & Content',
            'recent_wins': 'Metrics & Growth'
        };
        for (const [fieldName, fieldValue] of Object.entries(fields)) {
            const category = categoryMap[fieldName] || 'Other';
            categories[category][fieldName] = fieldValue;
        }
        // Remove empty categories
        Object.keys(categories).forEach(cat => {
            if (Object.keys(categories[cat]).length === 0) {
                delete categories[cat];
            }
        });
        return categories;
    }
    /**
     * Convert field name to display name
     */
    toDisplayName(fieldName) {
        return fieldName
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    /**
     * Cache generated context
     */
    async cacheContext(userId, versionId, format, content, fieldsIncluded) {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // Cache for 24 hours
        const { error } = await this.supabase
            .from('claude_context_cache')
            .upsert({
            user_id: userId,
            version_id: versionId,
            format,
            content,
            fields_included: fieldsIncluded,
            generated_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            access_count: 0
        }, {
            onConflict: 'version_id,format'
        });
        if (error) {
            console.error('Failed to cache context:', error);
        }
    }
    /**
     * Get cached context if available and not expired
     */
    async getCachedContext(versionId, format = 'markdown') {
        const { data, error } = await this.supabase
            .from('claude_context_cache')
            .select('*')
            .eq('version_id', versionId)
            .eq('format', format)
            .gt('expires_at', new Date().toISOString())
            .single();
        if (error || !data) {
            return null;
        }
        // Increment access count
        await this.supabase
            .from('claude_context_cache')
            .update({ access_count: data.access_count + 1 })
            .eq('id', data.id);
        return data.content;
    }
    /**
     * Extract business context changes from Claude conversation
     * Uses Claude API to analyze conversation and extract structured updates
     */
    async extractChangesFromConversation(_conversationId, messages, claudeApiKey) {
        // This would use Claude API to analyze the conversation
        // and extract business context changes
        const extractionPrompt = `
Analyze this conversation and extract any business context changes that should be tracked.

Look for updates to:
- ICP (Ideal Customer Profile)
- Positioning and messaging
- Business metrics (follower counts, deal sizes)
- Strategic focus or pivots
- Active experiments or tests
- Recent wins or achievements

Return a JSON array of changes in this format:
[
  {
    "field_name": "icp",
    "field_value": { "target_customer": "...", "pain_points": [...] },
    "field_type": "json",
    "confidence": 0.95
  }
]

Only include changes that were explicitly discussed or decided in the conversation.
Set confidence between 0-1 based on how clear the change was.
`;
        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': claudeApiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-3-5-sonnet-20241022',
                    max_tokens: 4096,
                    messages: [
                        ...messages,
                        { role: 'user', content: extractionPrompt }
                    ]
                })
            });
            if (!response.ok) {
                throw new Error(`Claude API error: ${response.status}`);
            }
            const result = await response.json();
            const extractedText = result.content[0].text;
            // Parse JSON from response
            const jsonMatch = extractedText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return [];
        }
        catch (error) {
            console.error('Failed to extract changes from conversation:', error);
            return [];
        }
    }
    /**
     * Generate comparison context showing what changed
     */
    async generateChangeContext(versionFromId, versionToId) {
        const { data: diff, error } = await this.supabase
            .rpc('calculate_version_diff', {
            p_version_from: versionFromId,
            p_version_to: versionToId
        });
        if (error || !diff) {
            return 'No changes found';
        }
        const lines = [];
        lines.push('# Context Changes');
        lines.push('');
        for (const change of diff) {
            if (change.change_type === 'unchanged')
                continue;
            lines.push(`## ${this.toDisplayName(change.field_name)}`);
            lines.push('');
            if (change.change_type === 'added') {
                lines.push('**Status:** Added');
                lines.push('');
                lines.push('**New Value:**');
                lines.push(this.formatValue(change.new_value));
            }
            else if (change.change_type === 'removed') {
                lines.push('**Status:** Removed');
                lines.push('');
                lines.push('**Previous Value:**');
                lines.push(this.formatValue(change.old_value));
            }
            else {
                lines.push('**Status:** Modified');
                lines.push('');
                lines.push('**Previous Value:**');
                lines.push(this.formatValue(change.old_value));
                lines.push('');
                lines.push('**New Value:**');
                lines.push(this.formatValue(change.new_value));
            }
            lines.push('');
        }
        return lines.join('\n');
    }
}
