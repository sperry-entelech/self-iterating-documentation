/**
 * Database Migration Runner
 * Helps set up the Supabase database schema
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

async function runMigration() {
  console.log('🚀 Context Version Control - Database Migration\n');

  // Check for required environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing environment variables');
    console.log('\nPlease set the following in your .env file:');
    console.log('  SUPABASE_URL=https://xxx.supabase.co');
    console.log('  SUPABASE_SERVICE_KEY=eyJxxx...\n');
    process.exit(1);
  }

  console.log(`📊 Connecting to: ${supabaseUrl}\n`);

  try {
    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('📄 Schema file loaded');
    console.log(`   ${schemaSql.split('\n').length} lines\n`);

    // Import Supabase client
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔨 Running migrations...\n');

    // Split SQL into individual statements
    const statements = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.trim() === '') {
        continue;
      }

      try {
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        });

        if (error) {
          // Try alternative method
          const { error: error2 } = await supabase
            .from('_migrations')
            .insert({ sql: statement });

          if (error2) {
            console.log(`⚠️  Warning: ${error.message.substring(0, 60)}...`);
            errorCount++;
          } else {
            successCount++;
          }
        } else {
          successCount++;
        }

      } catch (error) {
        console.log(`⚠️  Warning: ${error.message.substring(0, 60)}...`);
        errorCount++;
      }

      // Show progress
      if ((i + 1) % 10 === 0) {
        console.log(`   Progress: ${i + 1}/${statements.length} statements`);
      }
    }

    console.log('\n✅ Migration complete!\n');
    console.log(`   Successful: ${successCount}`);
    console.log(`   Warnings: ${errorCount}\n`);

    // Verify tables
    console.log('🔍 Verifying tables...\n');

    const expectedTables = [
      'context_versions',
      'business_state',
      'context_changes',
      'api_sources',
      'sync_history',
      'claude_context_cache',
      'claude_conversations',
      'field_definitions',
      'user_settings'
    ];

    let foundTables = 0;

    for (const table of expectedTables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (!error) {
        console.log(`   ✓ ${table}`);
        foundTables++;
      } else {
        console.log(`   ✗ ${table} - ${error.message}`);
      }
    }

    console.log(`\n   Found ${foundTables}/${expectedTables.length} tables\n`);

    if (foundTables === expectedTables.length) {
      console.log('🎉 Database setup complete!\n');
      console.log('Next steps:');
      console.log('  1. Deploy to Cloudflare: npm run deploy');
      console.log('  2. Set secrets: wrangler secret put SUPABASE_URL');
      console.log('  3. Test API: curl https://your-worker.workers.dev/health\n');
    } else {
      console.log('⚠️  Some tables missing. Manual setup may be required.\n');
      console.log('Try running schema.sql directly in Supabase SQL Editor:\n');
      console.log('  1. Go to https://supabase.com/dashboard');
      console.log('  2. Select your project');
      console.log('  3. Go to SQL Editor');
      console.log('  4. Click "New Query"');
      console.log('  5. Paste contents of database/schema.sql');
      console.log('  6. Click "Run"\n');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('  1. Verify SUPABASE_URL and SUPABASE_SERVICE_KEY are correct');
    console.log('  2. Check network connection');
    console.log('  3. Ensure Supabase project is active');
    console.log('  4. Try manual SQL execution in Supabase dashboard\n');
    process.exit(1);
  }
}

// Alternative: Generate .env file template
function generateEnvTemplate() {
  const template = `# Context Version Control - Environment Variables

# Supabase Configuration
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxx...

# Twitter API (Optional)
TWITTER_BEARER_TOKEN=AAAAAAAAAxxxxxxxxx

# Claude API (Optional)
CLAUDE_API_KEY=sk-ant-xxx

# Environment
ENVIRONMENT=development
`;

  fs.writeFileSync('.env.example', template);
  console.log('✓ Created .env.example');
  console.log('\nCopy to .env and fill in your values:');
  console.log('  cp .env.example .env\n');
}

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--init')) {
    generateEnvTemplate();
  } else {
    runMigration();
  }
}

module.exports = { runMigration };
