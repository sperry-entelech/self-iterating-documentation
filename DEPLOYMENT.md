# Deployment Guide - Context Version Control

Complete step-by-step guide to deploy "Git for Business Context" to production.

---

## Prerequisites

Before you begin, ensure you have:

- ✅ Node.js 18+ installed
- ✅ Cloudflare account (free tier works)
- ✅ Supabase account (free tier works)
- ✅ Twitter Developer Account (optional, for Twitter integration)
- ✅ Claude API key (optional, for conversation extraction)

---

## Step 1: Supabase Setup

### 1.1 Create New Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in:
   - Name: `context-version-control`
   - Database Password: (generate strong password)
   - Region: (choose closest to your users)
4. Click "Create new project"
5. Wait for project to initialize (~2 minutes)

### 1.2 Get Database Credentials

1. Go to Project Settings → Database
2. Copy these values:
   ```
   Host: db.xxx.supabase.co
   Database name: postgres
   Port: 5432
   User: postgres
   ```
3. Go to Project Settings → API
4. Copy:
   ```
   URL: https://xxx.supabase.co
   Service Role Key: eyJxxx... (keep this secret!)
   ```

### 1.3 Run Database Schema

**Option A: SQL Editor (Web UI)**

1. Go to SQL Editor in Supabase dashboard
2. Click "New Query"
3. Paste entire contents of `database/schema.sql`
4. Click "Run"
5. Verify tables created in Table Editor

**Option B: psql Command Line**

```bash
# Install PostgreSQL client if not already installed
# macOS: brew install postgresql
# Ubuntu: sudo apt-get install postgresql-client
# Windows: Download from postgresql.org

# Connect to Supabase
psql "postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres"

# Run schema file
\i database/schema.sql

# Verify tables
\dt

# Exit
\q
```

### 1.4 Enable Row Level Security (RLS)

```sql
-- Run in SQL Editor
ALTER TABLE context_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_sources ENABLE ROW LEVEL SECURITY;

-- Create policies (example - customize based on your auth strategy)
CREATE POLICY "Users can read own context"
  ON context_versions FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own context"
  ON context_versions FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);
```

---

## Step 2: Cloudflare Workers Setup

### 2.1 Install Wrangler

```bash
npm install -g wrangler

# Login to Cloudflare
wrangler login
```

### 2.2 Create KV Namespace

```bash
# Create development KV
wrangler kv:namespace create "CONTEXT_CACHE"
# Copy the ID shown

# Create production KV
wrangler kv:namespace create "CONTEXT_CACHE" --env production
# Copy the ID shown
```

### 2.3 Update wrangler.toml

Edit `wrangler.toml` and replace the KV namespace IDs:

```toml
[[kv_namespaces]]
binding = "CONTEXT_CACHE"
id = "YOUR_DEV_KV_ID_HERE"  # From step 2.2

[[env.production.kv_namespaces]]
binding = "CONTEXT_CACHE"
id = "YOUR_PROD_KV_ID_HERE"  # From step 2.2
```

### 2.4 Set Secrets

```bash
# Supabase URL
wrangler secret put SUPABASE_URL
# Paste: https://xxx.supabase.co

# Supabase Service Key
wrangler secret put SUPABASE_SERVICE_KEY
# Paste: eyJxxx... (service_role key from step 1.2)

# Twitter Bearer Token (optional)
wrangler secret put TWITTER_BEARER_TOKEN
# Get from: https://developer.twitter.com/en/portal/dashboard
# Paste: AAAAAAAAAAAAAAAAAxxxx

# Claude API Key (optional)
wrangler secret put CLAUDE_API_KEY
# Get from: https://console.anthropic.com/
# Paste: sk-ant-xxx
```

### 2.5 Install Dependencies

```bash
cd context-version-control
npm install
```

---

## Step 3: Development Testing

### 3.1 Local Development

```bash
# Start local dev server
npm run dev

# Server starts at http://localhost:8787
```

### 3.2 Test API Endpoints

```bash
# Test health endpoint
curl http://localhost:8787/health

# Create first commit
curl -X POST http://localhost:8787/api/context/commit \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user-001",
    "commit_message": "Initial context",
    "changes": [{
      "field_name": "icp",
      "field_value": {"target": "SMB"},
      "field_type": "json",
      "source": "manual"
    }]
  }'

# Get current state
curl "http://localhost:8787/api/context/current?user_id=test-user-001"
```

### 3.3 Test Dashboard

1. Open http://localhost:8787 in browser
2. Should see the dashboard UI
3. Click "New Commit" to test commit flow
4. Navigate through tabs to test all features

---

## Step 4: Production Deployment

### 4.1 Deploy to Cloudflare

```bash
# Deploy to production
npm run deploy

# Output will show:
# Published context-version-control (X.XX sec)
#   https://context-version-control.your-subdomain.workers.dev
```

### 4.2 Set Production Secrets

```bash
# Set secrets for production environment
wrangler secret put SUPABASE_URL --env production
wrangler secret put SUPABASE_SERVICE_KEY --env production
wrangler secret put TWITTER_BEARER_TOKEN --env production
wrangler secret put CLAUDE_API_KEY --env production
```

### 4.3 Configure Custom Domain (Optional)

```bash
# Add custom domain
wrangler publish --route "context.yourdomain.com/*"

# Or configure in Cloudflare Dashboard:
# 1. Go to Workers & Pages
# 2. Select your worker
# 3. Click "Add Custom Domain"
# 4. Enter: context.yourdomain.com
# 5. Click "Add Domain"
```

### 4.4 Enable Scheduled Cron Jobs

In `wrangler.toml`, add:

```toml
[triggers]
crons = ["0 * * * *"]  # Run every hour
```

Redeploy:

```bash
npm run deploy
```

---

## Step 5: Twitter Integration Setup

### 5.1 Create Twitter App

1. Go to [https://developer.twitter.com/en/portal/dashboard](https://developer.twitter.com/en/portal/dashboard)
2. Click "Create Project"
3. Fill in project details
4. Click "Create App"
5. Go to "Keys and tokens"
6. Generate "Bearer Token"
7. Copy the bearer token

### 5.2 Configure in System

```bash
# Set Twitter token
wrangler secret put TWITTER_BEARER_TOKEN
# Paste bearer token

# Redeploy
npm run deploy
```

### 5.3 Create API Source

```javascript
// POST to create Twitter integration
fetch('https://your-worker.workers.dev/api/integrations/twitter/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: 'your-user-id',
    username: 'your_twitter_handle',
    auto_commit_threshold: 1000
  })
});
```

---

## Step 6: Claude API Integration

### 6.1 Get Claude API Key

1. Go to [https://console.anthropic.com/](https://console.anthropic.com/)
2. Sign up or log in
3. Go to "API Keys"
4. Click "Create Key"
5. Copy the key (starts with `sk-ant-`)

### 6.2 Configure in System

```bash
# Set Claude API key
wrangler secret put CLAUDE_API_KEY
# Paste: sk-ant-xxx

# Redeploy
npm run deploy
```

---

## Step 7: Monitoring & Maintenance

### 7.1 Setup Cloudflare Analytics

1. Go to Workers & Pages in Cloudflare dashboard
2. Select your worker
3. Go to "Metrics" tab
4. Monitor:
   - Request volume
   - Error rate
   - Response times
   - CPU time

### 7.2 Setup Alerts

1. Go to "Notifications" in Cloudflare dashboard
2. Create new notification
3. Select triggers:
   - Error rate above 5%
   - Response time above 1000ms
4. Add email/webhook destination

### 7.3 Database Backups

In Supabase:

1. Go to Database → Backups
2. Enable automatic daily backups
3. Set retention period (7 days recommended)

### 7.4 Log Monitoring

```bash
# View live logs
wrangler tail

# View logs with filters
wrangler tail --format pretty --status error
```

---

## Step 8: Integration with Entelech Platform

### 8.1 Add to Entelech Dashboard

```javascript
// In your Entelech platform code:
const CONTEXT_API = 'https://context.yourdomain.com/api';

// Add navigation link
{
  name: 'Context Manager',
  href: '/tools/context',
  icon: GitBranchIcon
}

// Create route
app.get('/tools/context', (req, res) => {
  res.render('context-dashboard', {
    apiUrl: CONTEXT_API,
    userId: req.user.id
  });
});
```

### 8.2 Integrate with Skills Factory

```javascript
// In Skills Factory backend:
const { ClaudeContextGenerator } = require('./context-vc');

async function generateSkill(userId, template) {
  // Get dynamic context
  const contextGen = new ClaudeContextGenerator(env);
  const context = await contextGen.generateContext(userId, {
    format: 'markdown',
    includeFields: ['icp', 'positioning', 'current_focus']
  });

  // Use in skill generation
  const skill = await claude.generate({
    system: context.formatted_content,
    prompt: template
  });

  return skill;
}
```

---

## Step 9: Security Hardening

### 9.1 Enable CORS Protection

```javascript
// In src/api/routes.ts
app.use('/*', cors({
  origin: ['https://yourdomain.com', 'https://app.yourdomain.com'],
  credentials: true
}));
```

### 9.2 Add Rate Limiting

```bash
# Install rate limiter
npm install hono-rate-limiter
```

```javascript
// In src/api/routes.ts
import { rateLimiter } from 'hono-rate-limiter';

app.use('/api/*', rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100
}));
```

### 9.3 Add Authentication

```javascript
// Example JWT authentication
import { jwt } from 'hono/jwt';

app.use('/api/*', jwt({
  secret: env.JWT_SECRET
}));
```

---

## Step 10: Performance Optimization

### 10.1 Enable Caching

```javascript
// Add cache headers
app.get('/api/context/current', async (c) => {
  const state = await getCurrentState();

  return c.json(state, 200, {
    'Cache-Control': 'public, max-age=60',
    'CDN-Cache-Control': 'max-age=300'
  });
});
```

### 10.2 Database Indexes

```sql
-- Verify indexes exist (from schema.sql)
\d context_versions
\d business_state

-- Add custom indexes if needed
CREATE INDEX idx_custom ON table_name(column_name);
```

### 10.3 KV Cache Strategy

```javascript
// Cache frequently accessed data
const cacheKey = `context:${userId}:current`;
const cached = await env.CONTEXT_CACHE.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const fresh = await fetchFromDatabase();
await env.CONTEXT_CACHE.put(cacheKey, JSON.stringify(fresh), {
  expirationTtl: 300 // 5 minutes
});

return fresh;
```

---

## Troubleshooting

### Issue: "Failed to connect to Supabase"

**Solution:**
1. Check SUPABASE_URL is correct
2. Verify SUPABASE_SERVICE_KEY is service_role key, not anon key
3. Check IP allowlist in Supabase settings

### Issue: "Twitter API authentication failed"

**Solution:**
1. Verify bearer token is correct
2. Check Twitter app permissions
3. Ensure Essential access tier is enabled

### Issue: "Commits succeeding but changes not showing"

**Solution:**
1. Check `is_current` flag is being set correctly
2. Verify trigger `trigger_single_current_version` is working
3. Clear KV cache

### Issue: "Dashboard loads but shows no data"

**Solution:**
1. Open browser console, check for API errors
2. Verify CORS is configured correctly
3. Check user_id is being set properly

---

## Cost Estimates

### Free Tier (Perfect for getting started)

- **Cloudflare Workers:** 100,000 requests/day free
- **Supabase:** 500MB database, 1GB bandwidth/month free
- **Total:** $0/month

### Low Volume (~10K requests/month)

- **Cloudflare Workers:** Free tier
- **Supabase:** Free tier
- **Total:** $0/month

### Medium Volume (~1M requests/month)

- **Cloudflare Workers:** $5/month (Workers Paid plan)
- **Supabase:** Free tier still sufficient
- **Total:** $5/month

### High Volume (~10M requests/month)

- **Cloudflare Workers:** $5/month + $0.50 per million requests = ~$10/month
- **Supabase:** Pro plan $25/month (for better performance)
- **Total:** ~$35/month

---

## Next Steps

After deployment:

1. ✅ Run example scenario: `node examples/real-world-scenario.js`
2. ✅ Create your first real commit
3. ✅ Configure Twitter integration
4. ✅ Set up Claude API key
5. ✅ Integrate with your existing platform
6. ✅ Share feedback and feature requests

---

## Support

- **Documentation:** See README.md
- **Issues:** Create GitHub issue
- **Questions:** Twitter @entelech
- **Email:** support@entelech.net

---

**Deployment complete! Your business context is now version-controlled. 🚀**
