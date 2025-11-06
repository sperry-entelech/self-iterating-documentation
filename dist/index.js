/**
 * Context Version Control - Cloudflare Worker Entry Point
 * Git for Business Context - Dynamic context management for high-velocity operations
 */
import app from './api/routes';
export default {
    async fetch(request, env, ctx) {
        return app.fetch(request, env, ctx);
    },
    /**
     * Scheduled handler for automated sync tasks
     * Runs every hour to sync API data
     */
    async scheduled(_event, env, _ctx) {
        console.log('Running scheduled sync tasks...');
        try {
            // Get pending syncs from database
            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
            const { data: pendingSyncs, error } = await supabase
                .from('pending_syncs')
                .select('*')
                .limit(10); // Process 10 at a time
            if (error) {
                console.error('Failed to get pending syncs:', error);
                return;
            }
            if (!pendingSyncs || pendingSyncs.length === 0) {
                console.log('No pending syncs found');
                return;
            }
            console.log(`Processing ${pendingSyncs.length} pending syncs`);
            // Process each sync
            for (const sync of pendingSyncs) {
                try {
                    await processSyncTask(sync, env, supabase);
                }
                catch (error) {
                    console.error(`Failed to process sync ${sync.id}:`, error);
                }
            }
            console.log('Scheduled sync tasks completed');
        }
        catch (error) {
            console.error('Scheduled task failed:', error);
        }
    }
};
/**
 * Process a single sync task
 */
async function processSyncTask(sync, env, supabase) {
    const startTime = Date.now();
    const { TwitterIntegration } = await import('./integrations/twitter');
    try {
        let result;
        // Execute sync based on source type
        switch (sync.source_name) {
            case 'twitter':
                const twitter = new TwitterIntegration(env);
                result = await twitter.syncFollowerData(sync.user_id);
                break;
            case 'linkedin':
                // LinkedIn integration would go here
                result = {
                    source: 'api_linkedin',
                    success: false,
                    fields_updated: [],
                    changes_count: 0,
                    error: 'Not implemented',
                    timestamp: new Date()
                };
                break;
            default:
                console.log(`Unknown sync source: ${sync.source_name}`);
                return;
        }
        // Log sync result
        const { error: logError } = await supabase
            .from('sync_history')
            .insert({
            api_source_id: sync.id,
            user_id: sync.user_id,
            success: result.success,
            fields_updated: result.fields_updated,
            changes_count: result.changes_count,
            error_message: result.error,
            duration_ms: Date.now() - startTime
        });
        if (logError) {
            console.error('Failed to log sync result:', logError);
        }
        // Update last_synced timestamp
        const { error: updateError } = await supabase
            .from('api_sources')
            .update({
            last_synced: new Date().toISOString(),
            error_count: result.success ? 0 : (sync.error_count || 0) + 1,
            last_error: result.error || null
        })
            .eq('id', sync.id);
        if (updateError) {
            console.error('Failed to update sync timestamp:', updateError);
        }
        console.log(`✓ Sync completed for ${sync.source_name} in ${Date.now() - startTime}ms`);
    }
    catch (error) {
        console.error(`Sync task failed:`, error);
        // Log failure
        await supabase
            .from('sync_history')
            .insert({
            api_source_id: sync.id,
            user_id: sync.user_id,
            success: false,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            duration_ms: Date.now() - startTime
        });
    }
}
