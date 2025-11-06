/**
 * API Routes for Context Version Control
 * RESTful API built with Hono for Cloudflare Workers
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { VersionControlEngine } from '../core/version-control';
import { TwitterIntegration, WebhookIntegration } from '../integrations/twitter';
import { ClaudeContextGenerator } from '../integrations/claude';
const app = new Hono();
// Enable CORS
app.use('/*', cors());
// Helper to safely get env
function getEnv(c) {
    if (!c.env) {
        throw new Error('Environment not configured');
    }
    return c.env;
}
// Health check
app.get('/health', (c) => {
    return c.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});
// ============================================================================
// CORE CONTEXT MANAGEMENT
// ============================================================================
/**
 * Create a new context version (commit)
 * POST /api/context/commit
 */
app.post('/api/context/commit', async (c) => {
    try {
        const request = await c.req.json();
        const env = getEnv(c);
        // Validate request
        if (!request.user_id || !request.commit_message || !request.changes) {
            return c.json({ error: 'Missing required fields' }, 400);
        }
        const versionControl = new VersionControlEngine(env, request.user_id);
        const version = await versionControl.commit(request);
        return c.json({
            success: true,
            version: {
                id: version.id,
                hash: version.version_hash,
                message: version.commit_message,
                created_at: version.created_at
            }
        }, 201);
    }
    catch (error) {
        console.error('Commit failed:', error);
        return c.json({
            error: 'Failed to create commit',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, 500);
    }
});
/**
 * Get current business state
 * GET /api/context/current?user_id=<uuid>
 */
app.get('/api/context/current', async (c) => {
    try {
        const userId = c.req.query('user_id');
        if (!userId) {
            return c.json({ error: 'user_id is required' }, 400);
        }
        const env = getEnv(c);
        const versionControl = new VersionControlEngine(env, userId);
        const currentVersion = await versionControl.getCurrentVersion();
        if (!currentVersion) {
            return c.json({
                message: 'No context versions found. Create your first commit to get started.'
            }, 404);
        }
        const state = await versionControl.getVersionState(currentVersion.id);
        return c.json({
            version: {
                id: currentVersion.id,
                hash: currentVersion.version_hash,
                message: currentVersion.commit_message,
                created_at: currentVersion.created_at,
                author: currentVersion.author,
                tags: currentVersion.tags
            },
            state: Object.entries(state).reduce((acc, [name, field]) => {
                acc[name] = {
                    value: field.field_value,
                    type: field.field_type,
                    source: field.source,
                    updated_at: field.updated_at
                };
                return acc;
            }, {})
        });
    }
    catch (error) {
        console.error('Failed to get current state:', error);
        return c.json({
            error: 'Failed to retrieve current state',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, 500);
    }
});
/**
 * Get version history
 * GET /api/context/history?user_id=<uuid>&limit=50&offset=0
 */
app.get('/api/context/history', async (c) => {
    try {
        const userId = c.req.query('user_id');
        const limit = parseInt(c.req.query('limit') || '50');
        const offset = parseInt(c.req.query('offset') || '0');
        if (!userId) {
            return c.json({ error: 'user_id is required' }, 400);
        }
        const env = getEnv(c);
        const versionControl = new VersionControlEngine(env, userId);
        const history = await versionControl.getHistory(limit, offset);
        return c.json({
            total: history.length,
            limit,
            offset,
            versions: history.map(v => ({
                id: v.id,
                hash: v.version_hash.substring(0, 7),
                message: v.commit_message,
                created_at: v.created_at,
                author: v.author,
                tags: v.tags,
                is_current: v.is_current
            }))
        });
    }
    catch (error) {
        console.error('Failed to get history:', error);
        return c.json({
            error: 'Failed to retrieve history',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, 500);
    }
});
/**
 * Rollback to a previous version
 * POST /api/context/rollback
 */
app.post('/api/context/rollback', async (c) => {
    try {
        const request = await c.req.json();
        if (!request.user_id || !request.version_id) {
            return c.json({ error: 'Missing required fields' }, 400);
        }
        const env = getEnv(c);
        const versionControl = new VersionControlEngine(env, request.user_id);
        const newVersion = await versionControl.rollback(request);
        return c.json({
            success: true,
            message: 'Rollback successful',
            version: {
                id: newVersion.id,
                hash: newVersion.version_hash,
                message: newVersion.commit_message
            }
        });
    }
    catch (error) {
        console.error('Rollback failed:', error);
        return c.json({
            error: 'Failed to rollback',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, 500);
    }
});
/**
 * Compare two versions (diff)
 * GET /api/context/diff/:from/:to?user_id=<uuid>
 */
app.get('/api/context/diff/:from/:to', async (c) => {
    try {
        const userId = c.req.query('user_id');
        const versionFrom = c.req.param('from');
        const versionTo = c.req.param('to');
        if (!userId) {
            return c.json({ error: 'user_id is required' }, 400);
        }
        const env = getEnv(c);
        const versionControl = new VersionControlEngine(env, userId);
        const diff = await versionControl.diff(versionFrom, versionTo);
        return c.json({
            version_from: versionFrom,
            version_to: versionTo,
            changes: diff.changes,
            total_changes: diff.changes.length
        });
    }
    catch (error) {
        console.error('Diff failed:', error);
        return c.json({
            error: 'Failed to calculate diff',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, 500);
    }
});
// ============================================================================
// TEMPORAL QUERIES
// ============================================================================
/**
 * Get business state at specific date
 * GET /api/context/at/:date?user_id=<uuid>
 */
app.get('/api/context/at/:date', async (c) => {
    try {
        const userId = c.req.query('user_id');
        const dateParam = c.req.param('date');
        if (!userId) {
            return c.json({ error: 'user_id is required' }, 400);
        }
        const timestamp = new Date(dateParam);
        if (isNaN(timestamp.getTime())) {
            return c.json({ error: 'Invalid date format' }, 400);
        }
        const env = getEnv(c);
        const versionControl = new VersionControlEngine(env, userId);
        const state = await versionControl.getStateAtTime(timestamp);
        if (!state) {
            return c.json({
                message: 'No context found at this date'
            }, 404);
        }
        return c.json({
            timestamp: timestamp.toISOString(),
            version: {
                id: state.version_id,
                hash: state.version_hash,
                message: state.commit_message,
                created_at: state.created_at
            },
            state: state.fields
        });
    }
    catch (error) {
        console.error('Temporal query failed:', error);
        return c.json({
            error: 'Failed to retrieve historical state',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, 500);
    }
});
/**
 * Get field history
 * GET /api/context/field/:name/history?user_id=<uuid>&start=<date>&end=<date>
 */
app.get('/api/context/field/:name/history', async (c) => {
    try {
        const userId = c.req.query('user_id');
        const fieldName = c.req.param('name');
        const startDate = c.req.query('start');
        const endDate = c.req.query('end');
        if (!userId) {
            return c.json({ error: 'user_id is required' }, 400);
        }
        const timeRange = startDate && endDate ? {
            start: new Date(startDate),
            end: new Date(endDate)
        } : undefined;
        const env = getEnv(c);
        const versionControl = new VersionControlEngine(env, userId);
        const history = await versionControl.getFieldHistory(fieldName, timeRange);
        return c.json({
            field_name: fieldName,
            total_changes: history.length,
            changes: history.map(h => ({
                old_value: h.old_value,
                new_value: h.new_value,
                change_type: h.change_type,
                source: h.source,
                created_at: h.created_at
            }))
        });
    }
    catch (error) {
        console.error('Field history failed:', error);
        return c.json({
            error: 'Failed to retrieve field history',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, 500);
    }
});
// ============================================================================
// CLAUDE INTEGRATION
// ============================================================================
/**
 * Get Claude-formatted context
 * GET /api/context/claude-prompt?user_id=<uuid>&format=markdown
 */
app.get('/api/context/claude-prompt', async (c) => {
    try {
        const userId = c.req.query('user_id');
        const format = (c.req.query('format') || 'markdown');
        if (!userId) {
            return c.json({ error: 'user_id is required' }, 400);
        }
        const env = getEnv(c);
        const claudeGen = new ClaudeContextGenerator(env);
        const context = await claudeGen.generateContext(userId, { format });
        return c.text(context.formatted_content, 200, {
            'Content-Type': format === 'json' ? 'application/json' : 'text/plain'
        });
    }
    catch (error) {
        console.error('Claude context generation failed:', error);
        return c.json({
            error: 'Failed to generate Claude context',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, 500);
    }
});
/**
 * Update context from Claude chat
 * POST /api/context/update-from-chat
 */
app.post('/api/context/update-from-chat', async (c) => {
    try {
        const { user_id, conversation_id, messages } = await c.req.json();
        if (!user_id || !messages) {
            return c.json({ error: 'Missing required fields' }, 400);
        }
        const env = getEnv(c);
        const claudeGen = new ClaudeContextGenerator(env);
        const changes = await claudeGen.extractChangesFromConversation(conversation_id, messages, env.CLAUDE_API_KEY);
        if (changes.length === 0) {
            return c.json({
                message: 'No context changes detected in conversation'
            });
        }
        // Auto-commit high-confidence changes
        const highConfidenceChanges = changes.filter(ch => ch.confidence >= 0.8);
        if (highConfidenceChanges.length > 0) {
            const env = getEnv(c);
            const versionControl = new VersionControlEngine(env, user_id);
            const version = await versionControl.commit({
                user_id,
                commit_message: `Auto-update from Claude conversation ${conversation_id}`,
                changes: highConfidenceChanges.map(ch => ({
                    field_name: ch.field_name,
                    field_value: ch.field_value,
                    field_type: ch.field_type,
                    source: 'claude_chat'
                })),
                tags: ['auto-commit', 'claude-chat'],
                author: 'claude'
            });
            return c.json({
                success: true,
                committed_changes: highConfidenceChanges.length,
                pending_review: changes.length - highConfidenceChanges.length,
                version: {
                    id: version.id,
                    hash: version.version_hash
                }
            });
        }
        return c.json({
            success: true,
            pending_review: changes.length,
            changes: changes
        });
    }
    catch (error) {
        console.error('Chat update failed:', error);
        return c.json({
            error: 'Failed to update from chat',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, 500);
    }
});
// ============================================================================
// API INTEGRATIONS
// ============================================================================
/**
 * Sync Twitter data
 * POST /api/integrations/twitter/sync
 */
app.post('/api/integrations/twitter/sync', async (c) => {
    try {
        const { user_id, username, auto_commit_threshold } = await c.req.json();
        if (!user_id || !username) {
            return c.json({ error: 'Missing required fields' }, 400);
        }
        const env = getEnv(c);
        const twitter = new TwitterIntegration(env);
        const result = await twitter.syncFollowerData(username);
        // Auto-commit if threshold is met
        if (result.success && auto_commit_threshold) {
            const env = getEnv(c);
            const versionControl = new VersionControlEngine(env, user_id);
            const currentVersion = await versionControl.getCurrentVersion();
            if (currentVersion) {
                // This would normally get the new count from the sync result
                // For now, we'll skip the auto-commit logic
                // const currentState = await versionControl.getVersionState(currentVersion.id);
            }
        }
        return c.json(result);
    }
    catch (error) {
        console.error('Twitter sync failed:', error);
        return c.json({
            error: 'Failed to sync Twitter data',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, 500);
    }
});
/**
 * Webhook handler for external integrations
 * POST /api/integrations/webhook/:source
 */
app.post('/api/integrations/webhook/:source', async (c) => {
    try {
        const source = c.req.param('source');
        const payload = await c.req.json();
        const signature = c.req.header('X-Webhook-Signature');
        // Validate webhook signature if provided
        if (signature) {
            const webhook = new WebhookIntegration();
            const env = getEnv(c);
            const secret = env[`WEBHOOK_SECRET_${source.toUpperCase()}`];
            if (secret) {
                const isValid = webhook.validateSignature(JSON.stringify(payload), signature, secret);
                if (!isValid) {
                    return c.json({ error: 'Invalid webhook signature' }, 401);
                }
            }
        }
        return c.json({
            success: true,
            message: `Webhook from ${source} received`,
            payload_size: JSON.stringify(payload).length
        });
    }
    catch (error) {
        console.error('Webhook processing failed:', error);
        return c.json({
            error: 'Failed to process webhook',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, 500);
    }
});
/**
 * Get statistics
 * GET /api/stats?user_id=<uuid>
 */
app.get('/api/stats', async (c) => {
    try {
        const userId = c.req.query('user_id');
        if (!userId) {
            return c.json({ error: 'user_id is required' }, 400);
        }
        const env = getEnv(c);
        const versionControl = new VersionControlEngine(env, userId);
        const stats = await versionControl.getStats();
        return c.json(stats);
    }
    catch (error) {
        console.error('Stats failed:', error);
        return c.json({
            error: 'Failed to get statistics',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, 500);
    }
});
export default app;
