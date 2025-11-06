# Context Version Control

> **Git for Business Context** - Version control system for high-velocity business state management

## Overview

Context Version Control solves the problem of managing rapidly changing business context for AI-powered operations. Traditional static project files can't keep up with businesses moving at "blitz speed" - this system provides git-like versioning, temporal queries, and automated API synchronization for business state.

### The Problem (From Twitter Validation)

High-velocity businesses need:
- ✅ **Version control for context** - Track ICP changes, positioning pivots, strategic shifts
- ✅ **Temporal awareness** - Answer "what was my positioning in September?"
- ✅ **Automated updates** - Auto-sync follower counts, deal sizes, metrics
- ✅ **Claude integration** - Dynamic context that replaces static files
- ✅ **Audit trail** - Complete history of business evolution
- ✅ **Rollback capability** - Undo failed experiments instantly

### The Solution

A **Cloudflare Worker + Supabase** system that provides:
- Git-like commits for business state changes
- Temporal queries to retrieve historical context
- Automated API integrations (Twitter, CRM, webhooks)
- Claude-optimized context generation
- Beautiful web dashboard for management
- Sub-200ms API response times globally

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Workers                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ API Handlers │  │ Scheduled    │  │ Static Files │     │
│  │ (Hono)       │  │ Sync Tasks   │  │ (Dashboard)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Supabase PostgreSQL                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Versions     │  │ Business     │  │ Changes      │     │
│  │ (git commits)│  │ State        │  │ (audit trail)│     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ API Sources  │  │ Sync History │  │ Claude Cache │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  External Integrations                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Twitter API  │  │ CRM APIs     │  │ Webhooks     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- Cloudflare account (free tier works)
- Supabase account (free tier works)
- Twitter Bearer Token (for Twitter integration)
- Claude API key (for conversation extraction)

### 1. Setup Supabase Database

```bash
# Create a new Supabase project at https://supabase.com

# Run the database schema
psql -h <your-supabase-host> -U postgres -d postgres -f database/schema.sql
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Secrets

```bash
# Set Supabase credentials
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_KEY

# Set Twitter API token (optional but recommended)
wrangler secret put TWITTER_BEARER_TOKEN

# Set Claude API key (for conversation extraction)
wrangler secret put CLAUDE_API_KEY
```

### 4. Deploy to Cloudflare

```bash
# Development
npm run dev

# Production
npm run deploy
```

### 5. Access Dashboard

Open `https://your-worker.workers.dev` in your browser to access the web dashboard.

---

## API Reference

### Core Context Management

#### Create Commit
```http
POST /api/context/commit
Content-Type: application/json

{
  "user_id": "uuid",
  "commit_message": "Updated ICP to focus on SMB manufacturing",
  "changes": [
    {
      "field_name": "icp",
      "field_value": {
        "target_customer": "SMB manufacturers",
        "pain_points": ["manual processes", "data silos"]
      },
      "field_type": "json",
      "source": "manual"
    }
  ],
  "tags": ["positioning-update"],
  "author": "john@example.com"
}
```

#### Get Current State
```http
GET /api/context/current?user_id=uuid
```

Response:
```json
{
  "version": {
    "id": "uuid",
    "hash": "a3f2b1c",
    "message": "Updated ICP to focus on SMB manufacturing",
    "created_at": "2025-11-02T10:30:00Z"
  },
  "state": {
    "icp": {
      "value": { "target_customer": "SMB manufacturers" },
      "type": "json",
      "source": "manual",
      "updated_at": "2025-11-02T10:30:00Z"
    }
  }
}
```

#### Get Version History
```http
GET /api/context/history?user_id=uuid&limit=50&offset=0
```

#### Rollback to Previous Version
```http
POST /api/context/rollback
Content-Type: application/json

{
  "user_id": "uuid",
  "version_id": "target-version-uuid",
  "reason": "Reverting failed positioning experiment"
}
```

#### Compare Versions (Diff)
```http
GET /api/context/diff/:from/:to?user_id=uuid
```

### Temporal Queries

#### Get State at Specific Date
```http
GET /api/context/at/2025-09-01T00:00:00Z?user_id=uuid
```

Returns the business state as it existed on September 1st, 2025.

#### Get Field History
```http
GET /api/context/field/follower_count/history?user_id=uuid&start=2025-10-01&end=2025-11-01
```

### Claude Integration

#### Get Claude-Formatted Context
```http
GET /api/context/claude-prompt?user_id=uuid&format=markdown
```

Formats: `markdown`, `json`, `yaml`

Returns optimized context ready to paste into Claude projects or conversations.

#### Update from Claude Conversation
```http
POST /api/context/update-from-chat
Content-Type: application/json

{
  "user_id": "uuid",
  "conversation_id": "conv-123",
  "messages": [
    { "role": "user", "content": "We're pivoting to enterprise..." },
    { "role": "assistant", "content": "Great! Let me update..." }
  ]
}
```

Automatically extracts and commits business context changes from conversations.

### API Integrations

#### Sync Twitter Data
```http
POST /api/integrations/twitter/sync
Content-Type: application/json

{
  "user_id": "uuid",
  "username": "your_twitter_handle",
  "auto_commit_threshold": 1000
}
```

#### Webhook Handler
```http
POST /api/integrations/webhook/:source
X-Webhook-Signature: hmac-sha256-signature
Content-Type: application/json

{
  "deal_size": 50000,
  "stage": "closed-won"
}
```

### Statistics

#### Get Analytics
```http
GET /api/stats?user_id=uuid
```

---

## Usage Examples

### Example 1: Track ICP Evolution

```javascript
// Initial ICP
await fetch('/api/context/commit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: 'your-uuid',
    commit_message: 'Initial ICP definition',
    changes: [{
      field_name: 'icp',
      field_value: {
        target_customer: 'Solo consultants',
        pain_points: ['Manual client management', 'Proposal creation'],
        deal_size: 2000
      },
      field_type: 'json',
      source: 'manual'
    }]
  })
});

// Three months later: ICP evolved
await fetch('/api/context/commit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: 'your-uuid',
    commit_message: 'ICP shift: Moving upmarket to agencies',
    changes: [{
      field_name: 'icp',
      field_value: {
        target_customer: 'Creative agencies 10-50 employees',
        pain_points: ['Client reporting', 'Resource allocation', 'Project profitability'],
        deal_size: 15000
      },
      field_type: 'json',
      source: 'manual'
    }],
    tags: ['pivot', 'upmarket']
  })
});

// Query historical ICP
const septemberICP = await fetch(
  '/api/context/at/2025-09-15?user_id=your-uuid'
).then(r => r.json());

console.log('Our ICP in September:', septemberICP.state.icp.value);
```

### Example 2: Auto-Sync Twitter Growth

```javascript
// Configure Twitter integration
const apiSource = await createAPISource({
  user_id: 'your-uuid',
  source_name: 'twitter',
  field_mappings: {
    'followers_count': 'twitter_follower_count',
    'following_count': 'twitter_following_count'
  },
  update_frequency: 3600, // Every hour
  credentials: {
    username: 'your_handle'
  }
});

// Auto-commits when follower count changes by 1000+
// Timeline will show:
// - a3f2b1c "Follower milestone: Hit 35K followers"
// - b4e3c2d "Follower milestone: Hit 36K followers"
// - c5f4d3e "Follower milestone: Hit 40K followers"
```

### Example 3: Claude Integration

```javascript
// Get current context for Claude
const context = await fetch(
  '/api/context/claude-prompt?user_id=your-uuid&format=markdown'
).then(r => r.text());

// Paste into Claude Project files or use in API:
const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': CLAUDE_API_KEY,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    system: context, // Dynamic context here!
    messages: [
      { role: 'user', content: 'Help me write positioning copy' }
    ]
  })
});
```

### Example 4: Track Deal Progression

```javascript
// Webhook from CRM when deal updates
app.post('/webhook/crm', async (req, res) => {
  const { deal_id, stage, amount } = req.body;

  await fetch('/api/context/commit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: 'your-uuid',
      commit_message: `Deal ${deal_id} moved to ${stage}: $${amount}`,
      changes: [{
        field_name: 'current_deals',
        field_value: await getCurrentDeals(), // Fetch all active deals
        field_type: 'array',
        source: 'api_webhook'
      }],
      tags: ['crm-sync', stage]
    })
  });
});

// Query deal history
const dealHistory = await fetch(
  '/api/context/field/current_deals/history?user_id=your-uuid&start=2025-10-01&end=2025-11-01'
).then(r => r.json());

console.log('Deal progression over time:', dealHistory.changes);
```

---

## Real-World Scenarios

### Scenario 1: The Follower Milestone

**Problem:** You hit 40K followers (up from 35K), and Claude still thinks you have 35K because you manually updated your project file weeks ago.

**Solution:**
```bash
# Twitter integration auto-syncs every hour
# When followers hit 36K, 37K, 38K, 39K, 40K:
# → Auto-commits created with current count
# → Claude always gets latest count
# → No manual updates needed
```

### Scenario 2: The Positioning Pivot

**Problem:** You experimented with new positioning for 2 weeks. It failed. You need to revert to the old messaging but can't remember exactly what it was.

**Solution:**
```javascript
// View history
const history = await getHistory();

// Find version before the experiment (2 weeks ago)
const beforeExperiment = history.find(v =>
  v.created_at < twoWeeksAgo
);

// Rollback in one click
await rollback({
  version_id: beforeExperiment.id,
  reason: 'Positioning experiment failed - reverting'
});

// All messaging instantly restored
```

### Scenario 3: The "What Changed?" Question

**Problem:** Sales team asks: "Why did we change our ICP from solo consultants to agencies?"

**Solution:**
```javascript
// Compare versions
const diff = await fetch(
  '/api/context/diff/old-version/new-version?user_id=your-uuid'
).then(r => r.json());

// Shows:
// Field: icp
// Old: { target_customer: 'Solo consultants', deal_size: 2000 }
// New: { target_customer: 'Agencies 10-50', deal_size: 15000 }
// Commit message: "Moving upmarket - better unit economics"
// Author: john@entelech.net
// Date: 2025-09-15
```

### Scenario 4: The Multi-Agent System

**Problem:** Multiple Claude agents need consistent, current business context. Managing separate project files is painful.

**Solution:**
```javascript
// All agents pull from same dynamic context
const marketingAgent = new Claude({
  system: await getClaudeContext(user_id, ['positioning', 'content_themes'])
});

const salesAgent = new Claude({
  system: await getClaudeContext(user_id, ['icp', 'current_deals'])
});

const strategyAgent = new Claude({
  system: await getClaudeContext(user_id, ['recent_pivots', 'active_experiments'])
});

// All agents stay in sync automatically
// One commit updates all agents
```

---

## Database Schema

### Key Tables

**context_versions** - Git-like commits
- Stores version hash, message, author, timestamp
- Parent version ID for history tracking
- Tags for categorization

**business_state** - Versioned fields
- Field name, value (JSONB), type
- Links to version
- Tracks data source

**context_changes** - Audit trail
- Old value → new value
- Change type (create/update/delete)
- Complete history

**api_sources** - Integration config
- API endpoints, credentials
- Update frequency, field mappings
- Sync status tracking

See `database/schema.sql` for complete schema.

---

## Performance

### Benchmarks

- **Current state retrieval:** < 50ms (cached), < 200ms (uncached)
- **Temporal queries:** < 500ms (optimized with indexes)
- **Commit operations:** < 300ms (includes audit trail)
- **Claude context generation:** < 100ms (cached), < 500ms (fresh)

### Optimization Tips

1. **Use KV caching** for frequently accessed context
2. **Batch commits** when syncing multiple fields
3. **Enable indexes** on frequently queried fields
4. **Set appropriate TTLs** for Claude context cache

---

## Security

### Authentication

Currently uses UUID-based user identification. For production:

```javascript
// Add authentication middleware
app.use('/api/*', async (c, next) => {
  const token = c.req.header('Authorization');
  const user = await verifyToken(token);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  c.set('user', user);
  await next();
});
```

### Webhook Signatures

```javascript
// Validate webhook authenticity
const signature = req.header('X-Webhook-Signature');
const isValid = validateSignature(
  req.body,
  signature,
  WEBHOOK_SECRET
);
```

### API Rate Limiting

```javascript
// Add rate limiting
import { rateLimiter } from 'hono-rate-limiter';

app.use('/api/*', rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // 100 requests per window
}));
```

---

## Deployment

### Cloudflare Workers

```bash
# Deploy to production
npm run deploy

# Set environment
wrangler secret put ENVIRONMENT
# Enter: production

# Configure custom domain
wrangler publish --route "context.yourdomain.com/*"
```

### Supabase

```bash
# Production database
1. Create new Supabase project
2. Run schema.sql
3. Enable Row Level Security
4. Set up backup schedule
```

### Monitoring

```javascript
// Add Cloudflare analytics
export default {
  fetch(request, env, ctx) {
    ctx.waitUntil(
      logAnalytics(request, env)
    );
    return app.fetch(request, env, ctx);
  }
}
```

---

## Integration with Entelech Platform

### Skills Factory Integration

```javascript
// Use dynamic context in skill generation
const skill = await generateSkill({
  template: skillTemplate,
  dynamicContext: await getClaudeContext(userId),
  version: 'current'
});
```

### Agent System Integration

```javascript
// Feed context to agent system
const agent = new EntelechAgent({
  systemPrompt: await getClaudeContext(userId, {
    format: 'markdown',
    includeFields: ['icp', 'positioning', 'current_focus']
  })
});
```

---

## Roadmap

### Phase 2 Features
- [ ] Branching and merging (A/B test positioning)
- [ ] Conflict resolution for simultaneous updates
- [ ] Visual diff viewer in dashboard
- [ ] Export to git repository
- [ ] Slack notifications for changes
- [ ] LinkedIn integration
- [ ] HubSpot/Salesforce connectors

### Phase 3 Features
- [ ] Multi-user collaboration
- [ ] Change approval workflows
- [ ] Scheduled rollouts
- [ ] AI-powered change suggestions
- [ ] Natural language queries ("when did we last update ICP?")

---

## License

MIT License - See LICENSE file for details

---

## Support

- GitHub Issues: https://github.com/entelech/context-version-control/issues
- Documentation: https://docs.entelech.net/context-vc
- Twitter: @entelech

---

**Built by Entelech for high-velocity business operators who need their AI systems to keep up with their speed.**
