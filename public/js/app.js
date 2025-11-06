/**
 * Context Version Control - Frontend Application
 */

class ContextApp {
  constructor() {
    this.apiUrl = window.location.origin + '/api';
    this.userId = this.getUserId();
    this.currentVersion = null;
    this.init();
  }

  /**
   * Get or create user ID from localStorage
   */
  getUserId() {
    let userId = localStorage.getItem('context_user_id');
    if (!userId) {
      userId = this.generateUUID();
      localStorage.setItem('context_user_id', userId);
    }
    return userId;
  }

  /**
   * Generate UUID v4
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Initialize the application
   */
  async init() {
    this.setupEventListeners();
    this.setupNavigation();
    await this.loadCurrentState();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Commit button
    document.getElementById('commit-btn').addEventListener('click', () => {
      this.showCommitModal();
    });

    // Sync button
    document.getElementById('sync-btn').addEventListener('click', () => {
      this.syncIntegrations();
    });

    // Modal close
    document.querySelector('.modal-close').addEventListener('click', () => {
      this.closeModal();
    });

    // Cancel commit
    document.getElementById('cancel-commit-btn').addEventListener('click', () => {
      this.closeModal();
    });

    // Submit commit
    document.getElementById('submit-commit-btn').addEventListener('click', () => {
      this.submitCommit();
    });

    // Add change button
    document.getElementById('add-change-btn').addEventListener('click', () => {
      this.addChangeField();
    });

    // Temporal query
    document.getElementById('query-btn').addEventListener('click', () => {
      this.executeTemporalQuery();
    });

    // Claude context actions
    document.getElementById('copy-context-btn').addEventListener('click', () => {
      this.copyClaudeContext();
    });

    document.getElementById('refresh-context-btn').addEventListener('click', () => {
      this.loadClaudeContext();
    });

    document.getElementById('format-select').addEventListener('change', () => {
      this.loadClaudeContext();
    });
  }

  /**
   * Setup navigation
   */
  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = item.dataset.tab;

        // Update active nav item
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        // Show corresponding tab
        document.querySelectorAll('.tab-content').forEach(content => {
          content.classList.remove('active');
        });
        document.getElementById(`${tab}-tab`).classList.add('active');

        // Load tab data
        this.loadTabData(tab);
      });
    });
  }

  /**
   * Load data for active tab
   */
  async loadTabData(tab) {
    switch (tab) {
      case 'current':
        await this.loadCurrentState();
        break;
      case 'history':
        await this.loadHistory();
        break;
      case 'claude':
        await this.loadClaudeContext();
        break;
      case 'stats':
        await this.loadStats();
        break;
    }
  }

  /**
   * Load current business state
   */
  async loadCurrentState() {
    try {
      const response = await fetch(`${this.apiUrl}/context/current?user_id=${this.userId}`);

      if (response.status === 404) {
        this.showEmptyState();
        return;
      }

      const data = await response.json();
      this.currentVersion = data.version;

      // Update version card
      document.getElementById('current-hash').textContent = data.version.hash;
      document.getElementById('current-date').textContent = new Date(data.version.created_at).toLocaleString();
      document.getElementById('current-message').textContent = data.version.message;

      // Render fields
      this.renderFields(data.state);

    } catch (error) {
      console.error('Failed to load current state:', error);
      this.showError('Failed to load current state');
    }
  }

  /**
   * Render business state fields
   */
  renderFields(state) {
    const container = document.getElementById('current-fields');
    container.innerHTML = '';

    Object.entries(state).forEach(([name, field]) => {
      const card = document.createElement('div');
      card.className = 'field-card';

      const header = document.createElement('div');
      header.className = 'field-header';

      const fieldName = document.createElement('div');
      fieldName.className = 'field-name';
      fieldName.textContent = this.formatFieldName(name);

      const source = document.createElement('div');
      source.className = 'field-source';
      source.textContent = field.source;

      header.appendChild(fieldName);
      header.appendChild(source);

      const value = document.createElement('div');
      value.className = 'field-value';
      value.textContent = this.formatFieldValue(field.value);

      card.appendChild(header);
      card.appendChild(value);
      container.appendChild(card);
    });
  }

  /**
   * Format field name for display
   */
  formatFieldName(name) {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Format field value for display
   */
  formatFieldValue(value) {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  }

  /**
   * Load version history
   */
  async loadHistory() {
    try {
      const response = await fetch(`${this.apiUrl}/context/history?user_id=${this.userId}&limit=50`);
      const data = await response.json();

      const timeline = document.getElementById('version-timeline');
      timeline.innerHTML = '';

      data.versions.forEach(version => {
        const item = document.createElement('div');
        item.className = 'timeline-item';

        const card = document.createElement('div');
        card.className = 'timeline-card';

        const header = document.createElement('div');
        header.className = 'version-header';

        const info = document.createElement('div');
        info.className = 'version-info';

        const hash = document.createElement('span');
        hash.className = 'version-hash';
        hash.textContent = version.hash;

        const date = document.createElement('span');
        date.className = 'version-date';
        date.textContent = new Date(version.created_at).toLocaleString();

        info.appendChild(hash);
        info.appendChild(date);

        if (version.is_current) {
          const badge = document.createElement('span');
          badge.className = 'badge badge-success';
          badge.textContent = 'Current';
          header.appendChild(badge);
        }

        header.appendChild(info);

        const message = document.createElement('div');
        message.className = 'version-message';
        message.textContent = version.message;

        card.appendChild(header);
        card.appendChild(message);
        item.appendChild(card);
        timeline.appendChild(item);
      });

    } catch (error) {
      console.error('Failed to load history:', error);
      this.showError('Failed to load version history');
    }
  }

  /**
   * Execute temporal query
   */
  async executeTemporalQuery() {
    const dateInput = document.getElementById('date-picker');
    const date = dateInput.value;

    if (!date) {
      alert('Please select a date');
      return;
    }

    try {
      const response = await fetch(
        `${this.apiUrl}/context/at/${encodeURIComponent(date)}?user_id=${this.userId}`
      );

      const data = await response.json();
      const result = document.getElementById('temporal-result');

      if (response.status === 404) {
        result.innerHTML = '<p style="color: var(--text-muted);">No context found at this date</p>';
        return;
      }

      this.renderTemporalResult(data, result);

    } catch (error) {
      console.error('Temporal query failed:', error);
      this.showError('Failed to execute temporal query');
    }
  }

  /**
   * Render temporal query result
   */
  renderTemporalResult(data, container) {
    container.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'version-card';

    const header = document.createElement('div');
    header.className = 'version-header';

    const info = document.createElement('div');
    info.className = 'version-info';

    const hash = document.createElement('span');
    hash.className = 'version-hash';
    hash.textContent = data.version.hash;

    const date = document.createElement('span');
    date.className = 'version-date';
    date.textContent = new Date(data.version.created_at).toLocaleString();

    info.appendChild(hash);
    info.appendChild(date);
    header.appendChild(info);

    const message = document.createElement('div');
    message.className = 'version-message';
    message.textContent = data.version.message;

    card.appendChild(header);
    card.appendChild(message);

    const fieldsGrid = document.createElement('div');
    fieldsGrid.className = 'fields-grid';
    fieldsGrid.style.marginTop = 'var(--spacing-lg)';

    Object.entries(data.state).forEach(([name, field]) => {
      const fieldCard = document.createElement('div');
      fieldCard.className = 'field-card';

      const fieldHeader = document.createElement('div');
      fieldHeader.className = 'field-header';

      const fieldName = document.createElement('div');
      fieldName.className = 'field-name';
      fieldName.textContent = this.formatFieldName(name);

      fieldHeader.appendChild(fieldName);

      const fieldValue = document.createElement('div');
      fieldValue.className = 'field-value';
      fieldValue.textContent = this.formatFieldValue(field.value);

      fieldCard.appendChild(fieldHeader);
      fieldCard.appendChild(fieldValue);
      fieldsGrid.appendChild(fieldCard);
    });

    container.appendChild(card);
    container.appendChild(fieldsGrid);
  }

  /**
   * Load Claude context
   */
  async loadClaudeContext() {
    const format = document.getElementById('format-select').value;

    try {
      const response = await fetch(
        `${this.apiUrl}/context/claude-prompt?user_id=${this.userId}&format=${format}`
      );

      const content = await response.text();
      document.getElementById('claude-context-code').textContent = content;

    } catch (error) {
      console.error('Failed to load Claude context:', error);
      this.showError('Failed to load Claude context');
    }
  }

  /**
   * Copy Claude context to clipboard
   */
  async copyClaudeContext() {
    const code = document.getElementById('claude-context-code').textContent;

    try {
      await navigator.clipboard.writeText(code);
      const btn = document.getElementById('copy-context-btn');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<span class="icon">✓</span> Copied!';

      setTimeout(() => {
        btn.innerHTML = originalText;
      }, 2000);

    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy to clipboard');
    }
  }

  /**
   * Load statistics
   */
  async loadStats() {
    try {
      const response = await fetch(`${this.apiUrl}/stats?user_id=${this.userId}`);
      const data = await response.json();

      document.getElementById('total-versions').textContent = data.total_versions;
      document.getElementById('total-changes').textContent = data.total_changes;

      if (data.most_changed_fields.length > 0) {
        document.getElementById('most-changed').textContent =
          this.formatFieldName(data.most_changed_fields[0].field_name);
      }

    } catch (error) {
      console.error('Failed to load stats:', error);
      this.showError('Failed to load statistics');
    }
  }

  /**
   * Show commit modal
   */
  showCommitModal() {
    document.getElementById('commit-modal').classList.add('active');
    document.getElementById('commit-message').value = '';
    document.getElementById('changes-list').innerHTML = '';
    this.addChangeField();
  }

  /**
   * Close modal
   */
  closeModal() {
    document.getElementById('commit-modal').classList.remove('active');
  }

  /**
   * Add change field to modal
   */
  addChangeField() {
    const container = document.getElementById('changes-list');

    const changeDiv = document.createElement('div');
    changeDiv.className = 'change-item';
    changeDiv.style.marginBottom = 'var(--spacing-md)';

    changeDiv.innerHTML = `
      <input type="text" placeholder="Field name (e.g., icp)" class="commit-message-input" style="margin-bottom: 0.5rem;">
      <textarea placeholder="Field value (JSON format for objects)" class="commit-message-input" style="min-height: 60px;"></textarea>
    `;

    container.appendChild(changeDiv);
  }

  /**
   * Submit commit
   */
  async submitCommit() {
    const message = document.getElementById('commit-message').value;

    if (!message) {
      alert('Please enter a commit message');
      return;
    }

    const changeItems = document.querySelectorAll('.change-item');
    const changes = [];

    changeItems.forEach(item => {
      const inputs = item.querySelectorAll('input, textarea');
      const fieldName = inputs[0].value.trim();
      let fieldValue = inputs[1].value.trim();

      if (fieldName && fieldValue) {
        // Try to parse as JSON
        try {
          fieldValue = JSON.parse(fieldValue);
        } catch (e) {
          // Keep as string
        }

        changes.push({
          field_name: fieldName,
          field_value: fieldValue,
          field_type: typeof fieldValue === 'object' ? 'json' : 'text',
          source: 'manual'
        });
      }
    });

    if (changes.length === 0) {
      alert('Please add at least one change');
      return;
    }

    try {
      const response = await fetch(`${this.apiUrl}/context/commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: this.userId,
          commit_message: message,
          changes: changes,
          author: 'web-ui'
        })
      });

      const data = await response.json();

      if (data.success) {
        this.closeModal();
        await this.loadCurrentState();
        alert('Commit created successfully!');
      } else {
        throw new Error(data.error || 'Failed to create commit');
      }

    } catch (error) {
      console.error('Commit failed:', error);
      alert('Failed to create commit: ' + error.message);
    }
  }

  /**
   * Sync integrations
   */
  async syncIntegrations() {
    const btn = document.getElementById('sync-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="icon">⏳</span> Syncing...';
    btn.disabled = true;

    try {
      // This would normally trigger actual syncs
      await new Promise(resolve => setTimeout(resolve, 2000));

      btn.innerHTML = '<span class="icon">✓</span> Synced!';

      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }, 2000);

    } catch (error) {
      console.error('Sync failed:', error);
      btn.innerHTML = originalText;
      btn.disabled = false;
      this.showError('Sync failed');
    }
  }

  /**
   * Show empty state
   */
  showEmptyState() {
    const container = document.getElementById('current-fields');
    container.innerHTML = `
      <div style="text-align: center; padding: var(--spacing-xl); color: var(--text-muted);">
        <h3 style="margin-bottom: var(--spacing-md);">No Context Yet</h3>
        <p>Create your first commit to start tracking business context</p>
        <button class="btn btn-primary" style="margin-top: var(--spacing-lg);" onclick="app.showCommitModal()">
          Create First Commit
        </button>
      </div>
    `;
  }

  /**
   * Show error message
   */
  showError(message) {
    alert(message);
  }
}

// Initialize app when DOM is ready
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new ContextApp();
});
