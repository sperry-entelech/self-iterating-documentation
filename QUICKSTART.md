# Quick Start Guide - 5 Minutes to Running

Get Context Version Control running in 5 minutes.

---

## Prerequisites

- Node.js 18+ installed
- Cloudflare account (sign up free at cloudflare.com)
- Supabase account (sign up free at supabase.com)

---

## Step 1: Clone & Install (1 minute)

```bash
cd context-version-control
npm install
```

---

## Step 2: Setup Supabase (2 minutes)

1. Go to [supabase.com](https://supabase.com) → Create new project
2. Wait for initialization (~1 minute)
3. Go to **SQL Editor** → Click **New Query**
4. Copy entire contents of `database/schema.sql`
5. Paste and click **Run**
6. Go to **Project Settings** → **API**
7. Copy:
   - URL: `https://xxx.supabase.co`
   - Service Role Key: `eyJxxx...`

---

## Step 3: Configure Secrets (1 minute)

```bash
# Login to Cloudflare
wrangler login

# Set Supabase credentials
wrangler secret put SUPABASE_URL
# Paste: https://xxx.supabase.co

wrangler secret put SUPABASE_SERVICE_KEY
# Paste: eyJxxx...
```

---

## Step 4: Deploy (30 seconds)

```bash
npm run deploy
```

Output shows your URL:
```
Published context-version-control (2.45 sec)
  https://context-version-control.xxx.workers.dev
```

---

## Step 5: Test (30 seconds)

Open your browser to the URL from step 4. You should see the dashboard!

**Create your first commit:**

1. Click "New Commit"
2. Enter message: "Initial context"
3. Add field:
   - Name: `icp`
   - Value: `{"target": "SMB manufacturers"}`
4. Click "Commit"

**View your context:**

1. Click "Claude Context" tab
2. Click "Copy to Clipboard"
3. Paste into Claude Project or conversation

---

## Done! 🎉

You now have:
- ✅ Git for your business context
- ✅ Temporal queries
- ✅ Claude integration
- ✅ Web dashboard
- ✅ API endpoints

---

## Next Steps

### Add Twitter Integration

```bash
# Get bearer token from: https://developer.twitter.com/en/portal/dashboard
wrangler secret put TWITTER_BEARER_TOKEN
# Paste: AAAAAxxxxxxxxx

# Redeploy
npm run deploy
```

### Test Temporal Queries

```javascript
// Get state from September 1
fetch('https://your-worker.workers.dev/api/context/at/2025-09-01?user_id=your-id')

// Get follower count history
fetch('https://your-worker.workers.dev/api/context/field/follower_count/history?user_id=your-id')
```

### Run Example Scenario

```bash
# Edit examples/real-world-scenario.js
# Change API_BASE to your worker URL
# Change USER_ID to your user ID (from localStorage in browser)

node examples/real-world-scenario.js
```

This simulates 2 months of business evolution!

---

## Common Issues

**"Failed to connect to Supabase"**
- Verify URL and service key are correct
- Check they're set as secrets: `wrangler secret list`

**"Dashboard loads but shows 'No Context Yet'"**
- This is normal for first visit
- Click "Create First Commit" to get started

**"API returns 500 errors"**
- Check `wrangler tail` for error logs
- Verify database schema ran successfully
- Try running schema.sql again in Supabase

---

## Get Help

- Read full docs: `README.md`
- Deployment guide: `DEPLOYMENT.md`
- Example code: `examples/real-world-scenario.js`
- Open issue: GitHub Issues
- Twitter: @entelech

---

**That's it! Your business context is now version-controlled. 🚀**
