/**
 * Real-World Scenario: High-Velocity Business Context Management
 *
 * This example demonstrates the exact use case from the Twitter thread:
 * A business growing from 35K to 40K followers while constantly evolving
 * their ICP, positioning, and deal sizes.
 */

const API_BASE = 'http://localhost:8787/api'; // Change to your deployment URL
const USER_ID = 'demo-user-001'; // In production, use actual user UUID

/**
 * Scenario Timeline:
 *
 * September 1: Launch with initial positioning
 * September 15: Hit 35K followers
 * September 20: Update ICP based on customer feedback
 * October 1: First enterprise deal closes
 * October 10: Hit 36K followers
 * October 15: Pivot positioning to enterprise focus
 * October 25: Hit 38K followers
 * November 1: Hit 40K followers
 * November 2: Need to answer "what was our ICP in September?"
 */

async function runScenario() {
  console.log('🚀 Starting Context Version Control Demo\n');
  console.log('Simulating 2 months of high-velocity business evolution...\n');

  // ========================================================================
  // SEPTEMBER 1: Initial Launch
  // ========================================================================
  console.log('📅 September 1: Initial positioning');

  const initialCommit = await createCommit({
    commit_message: 'Initial positioning: Solo consultants & freelancers',
    changes: [
      {
        field_name: 'icp',
        field_value: {
          target_customer: 'Solo consultants and freelancers',
          company_size: '1-5 employees',
          pain_points: [
            'Manual client management',
            'Proposal creation takes too long',
            'No pipeline visibility'
          ],
          buying_triggers: [
            'Losing deals due to slow follow-up',
            'Spending 10+ hours/week on admin'
          ]
        },
        field_type: 'json',
        source: 'manual'
      },
      {
        field_name: 'positioning',
        field_value: {
          core_message: 'Automate your consulting business in 10 minutes',
          differentiators: [
            'No technical setup',
            'Works with existing tools',
            'Built for solo operators'
          ],
          value_proposition: 'Win back 10 hours per week'
        },
        field_type: 'json',
        source: 'manual'
      },
      {
        field_name: 'follower_count',
        field_value: {
          twitter: 30000,
          linkedin: 5000,
          total: 35000
        },
        field_type: 'json',
        source: 'manual'
      },
      {
        field_name: 'current_focus',
        field_value: 'Product-market fit with solo consultants',
        field_type: 'text',
        source: 'manual'
      }
    ]
  });

  console.log(`✓ Commit created: ${initialCommit.version.hash}`);
  console.log(`  Message: "${initialCommit.version.message}"\n`);

  // ========================================================================
  // SEPTEMBER 15: Follower Milestone
  // ========================================================================
  console.log('📅 September 15: Hit 35K followers');

  await createCommit({
    commit_message: 'Follower milestone: 35K total followers',
    changes: [
      {
        field_name: 'follower_count',
        field_value: {
          twitter: 32000,
          linkedin: 3000,
          total: 35000
        },
        field_type: 'json',
        source: 'api_twitter'
      },
      {
        field_name: 'recent_wins',
        field_value: [
          'Hit 35K followers',
          'Viral thread on automation (250K views)',
          'Featured in Business Insider'
        ],
        field_type: 'array',
        source: 'manual'
      }
    ],
    tags: ['milestone', 'growth']
  });

  console.log('✓ Auto-commit from Twitter integration\n');

  // ========================================================================
  // SEPTEMBER 20: ICP Update
  // ========================================================================
  console.log('📅 September 20: ICP evolution based on customer data');

  await createCommit({
    commit_message: 'ICP update: Adding boutique agencies to target market',
    changes: [
      {
        field_name: 'icp',
        field_value: {
          target_customer: 'Solo consultants, freelancers, and boutique agencies',
          company_size: '1-10 employees',
          pain_points: [
            'Manual client management',
            'Proposal creation takes too long',
            'No pipeline visibility',
            'Team coordination overhead'
          ],
          buying_triggers: [
            'Losing deals due to slow follow-up',
            'Spending 10+ hours/week on admin',
            'Team asking for better tools'
          ]
        },
        field_type: 'json',
        source: 'manual'
      }
    ],
    tags: ['icp-evolution']
  });

  console.log('✓ ICP expanded to include agencies\n');

  // ========================================================================
  // OCTOBER 1: First Enterprise Deal
  // ========================================================================
  console.log('📅 October 1: First enterprise deal closes');

  await createCommit({
    commit_message: 'Major milestone: First $50K enterprise deal closed',
    changes: [
      {
        field_name: 'current_deals',
        field_value: [
          {
            id: 'deal-001',
            company: 'Acme Consulting Group',
            deal_size: 50000,
            stage: 'closed-won',
            probability: 100,
            close_date: '2025-10-01'
          }
        ],
        field_type: 'array',
        source: 'api_crm'
      },
      {
        field_name: 'recent_pivots',
        field_value: [
          {
            date: '2025-10-01',
            from: 'Solo consultants only',
            to: 'Including mid-market agencies',
            reason: 'Enterprise buyers showing strong interest, better unit economics'
          }
        ],
        field_type: 'array',
        source: 'manual'
      }
    ],
    tags: ['milestone', 'enterprise', 'pivot']
  });

  console.log('✓ First enterprise deal tracked\n');

  // ========================================================================
  // OCTOBER 15: Positioning Pivot
  // ========================================================================
  console.log('📅 October 15: Major positioning pivot to enterprise');

  await createCommit({
    commit_message: 'Strategic pivot: Moving upmarket to enterprise agencies',
    changes: [
      {
        field_name: 'icp',
        field_value: {
          target_customer: 'Creative and consulting agencies',
          company_size: '10-50 employees',
          pain_points: [
            'Client reporting automation',
            'Resource allocation complexity',
            'Project profitability tracking',
            'Multi-stakeholder coordination'
          ],
          buying_triggers: [
            'Scaling from 10 to 20+ employees',
            'Revenue plateau due to operations',
            'Client churn from poor reporting'
          ]
        },
        field_type: 'json',
        source: 'manual'
      },
      {
        field_name: 'positioning',
        field_value: {
          core_message: 'Enterprise automation for scaling agencies',
          differentiators: [
            'Built for team collaboration',
            'Advanced reporting & analytics',
            'Integrates with enterprise stack',
            'White-glove onboarding'
          ],
          value_proposition: '10x your agency revenue without 10x headcount'
        },
        field_type: 'json',
        source: 'manual'
      },
      {
        field_name: 'current_focus',
        field_value: 'Enterprise product features and case studies',
        field_type: 'text',
        source: 'manual'
      },
      {
        field_name: 'active_experiments',
        field_value: [
          'Enterprise pricing tier ($500/mo)',
          'White-glove onboarding program',
          'Case study video series',
          'Agency partner program'
        ],
        field_type: 'array',
        source: 'manual'
      }
    ],
    tags: ['pivot', 'enterprise', 'positioning-update']
  });

  console.log('✓ Major positioning pivot committed\n');

  // ========================================================================
  // NOVEMBER 1: Hit 40K Followers
  // ========================================================================
  console.log('📅 November 1: Hit 40K followers');

  await createCommit({
    commit_message: 'Growth milestone: 40K followers (5K growth in 6 weeks)',
    changes: [
      {
        field_name: 'follower_count',
        field_value: {
          twitter: 36000,
          linkedin: 4000,
          total: 40000
        },
        field_type: 'json',
        source: 'api_twitter'
      }
    ],
    tags: ['milestone', 'growth']
  });

  console.log('✓ Follower milestone auto-committed\n');

  // ========================================================================
  // NOVEMBER 2: Temporal Queries
  // ========================================================================
  console.log('📅 November 2: Time to answer strategic questions\n');
  console.log('─────────────────────────────────────────────────────────\n');

  // Question 1: "What was our ICP in September?"
  console.log('❓ Question: "What was our ICP in September?"\n');

  const septemberState = await getStateAtTime('2025-09-15T00:00:00Z');
  console.log('📊 ICP in September:');
  console.log(JSON.stringify(septemberState.state.icp.value, null, 2));
  console.log('');

  // Question 2: "How has our positioning evolved?"
  console.log('❓ Question: "How has our positioning evolved?"\n');

  const positioningHistory = await getFieldHistory('positioning');
  console.log('📜 Positioning Evolution:');
  positioningHistory.changes.forEach((change, i) => {
    console.log(`\n${i + 1}. ${new Date(change.created_at).toLocaleDateString()}`);
    console.log(`   Old: "${change.old_value?.core_message || 'None'}"`);
    console.log(`   New: "${change.new_value?.core_message}"`);
  });
  console.log('');

  // Question 3: "When did we hit each follower milestone?"
  console.log('❓ Question: "When did we hit each follower milestone?"\n');

  const followerHistory = await getFieldHistory('follower_count');
  console.log('📈 Follower Growth:');
  followerHistory.changes.forEach((change, i) => {
    const date = new Date(change.created_at).toLocaleDateString();
    const count = change.new_value?.total || 0;
    console.log(`   ${date}: ${count.toLocaleString()} followers`);
  });
  console.log('');

  // Question 4: "What experiments are we running?"
  console.log('❓ Question: "What experiments are we currently running?"\n');

  const currentState = await getCurrentState();
  console.log('🧪 Active Experiments:');
  if (currentState.state.active_experiments) {
    currentState.state.active_experiments.value.forEach((exp, i) => {
      console.log(`   ${i + 1}. ${exp}`);
    });
  }
  console.log('');

  // ========================================================================
  // CLAUDE INTEGRATION
  // ========================================================================
  console.log('─────────────────────────────────────────────────────────\n');
  console.log('🤖 Claude Integration\n');

  const claudeContext = await getClaudeContext('markdown');
  console.log('Generated dynamic context for Claude:');
  console.log('─────────────────────────────────────────────────────────');
  console.log(claudeContext.substring(0, 500) + '...\n');
  console.log('✓ This context auto-updates as business evolves');
  console.log('✓ No more stale project files');
  console.log('✓ Claude always has current state\n');

  // ========================================================================
  // STATISTICS
  // ========================================================================
  console.log('─────────────────────────────────────────────────────────\n');
  console.log('📊 Statistics\n');

  const stats = await getStats();
  console.log(`Total Versions: ${stats.total_versions}`);
  console.log(`Total Changes: ${stats.total_changes}`);
  console.log(`Most Changed Field: ${stats.most_changed_fields[0]?.field_name || 'N/A'}`);
  console.log('');

  console.log('─────────────────────────────────────────────────────────\n');
  console.log('✅ Demo complete!\n');
  console.log('This demonstrates:');
  console.log('  ✓ Git-like versioning for business context');
  console.log('  ✓ Temporal queries (time travel)');
  console.log('  ✓ Automated API sync (Twitter)');
  console.log('  ✓ Claude integration');
  console.log('  ✓ Complete audit trail');
  console.log('');
}

// ============================================================================
// Helper Functions
// ============================================================================

async function createCommit({ commit_message, changes, tags = [], author = 'demo' }) {
  const response = await fetch(`${API_BASE}/context/commit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: USER_ID,
      commit_message,
      changes,
      tags,
      author
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Commit failed: ${error.error}`);
  }

  return response.json();
}

async function getCurrentState() {
  const response = await fetch(`${API_BASE}/context/current?user_id=${USER_ID}`);
  return response.json();
}

async function getStateAtTime(timestamp) {
  const response = await fetch(
    `${API_BASE}/context/at/${encodeURIComponent(timestamp)}?user_id=${USER_ID}`
  );
  return response.json();
}

async function getFieldHistory(fieldName) {
  const response = await fetch(
    `${API_BASE}/context/field/${fieldName}/history?user_id=${USER_ID}`
  );
  return response.json();
}

async function getClaudeContext(format = 'markdown') {
  const response = await fetch(
    `${API_BASE}/context/claude-prompt?user_id=${USER_ID}&format=${format}`
  );
  return response.text();
}

async function getStats() {
  const response = await fetch(`${API_BASE}/stats?user_id=${USER_ID}`);
  return response.json();
}

// ============================================================================
// Run the scenario
// ============================================================================

if (require.main === module) {
  runScenario().catch(console.error);
}

module.exports = { runScenario };
