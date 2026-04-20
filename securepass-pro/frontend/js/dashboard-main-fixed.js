// Fixed dashboard-main.js - sanitize returns raw text
(function() {
  'use strict';

  const API_BASE = '/api';

  function getToken() {
    return localStorage.getItem('securepass_token');
  }

  function sanitize(text) {
    return text || '';
  }

  function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer') || (() => {
      const div = document.createElement('div');
      div.id = 'notificationContainer';
      div.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;max-width:320px;';
      document.body.appendChild(div);
      return div;
    })();

    const alert = document.createElement('div');
    alert.className = `alert alert-${type} shadow-sm mb-2`;
    alert.textContent = message;
    container.appendChild(alert);

    setTimeout(() => alert.remove(), 4000);
  }

  async function apiFetch(endpoint) {
    const token = getToken();
    if (!token) return { success: false };
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return await res.json();
    } catch {
      return { success: false };
    }
  }

  // Refresh Reminders - Clean table structure
  async function refreshReminders() {
    const list = document.getElementById('remindersList');
    const countEl = document.getElementById('activeReminders');
    if (!list) return;

    const data = await apiFetch('/reminders');
    const reminders = data.success ? data.reminders : [];

    if (countEl) countEl.textContent = reminders.length;

    if (!reminders.length) {
      list.innerHTML = '<div class="text-center text-muted p-4">No reminders</div>';
      return;
    }

    let rows = reminders.map(r => {
      const exp = new Date(r.reminder_date).toLocaleDateString();
      const id = r._id;
      return `
        <tr data-id="${id}">
          <td>${sanitize(r.title)}</td>
          <td>${sanitize(r.description)}</td>
          <td>${exp}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-danger delete-reminder" data-id="${id}">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>`;
    }).join('');

    list.innerHTML = `
      <div class="table-responsive">
        <table class="table table-hover">
          <thead>
            <tr>
              <th>Title</th>
              <th>Description</th>
              <th>Expires</th>
              <th class="text-end">Action</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>`;

    // Delete handlers
    list.querySelectorAll('.delete-reminder').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('Delete reminder?')) {
          const id = btn.dataset.id;
          const token = getToken();
          try {
            const res = await fetch(`${API_BASE}/reminders/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
              btn.closest('tr').remove();
              if (countEl) countEl.textContent = parseInt(countEl.textContent) - 1;
            }
          } catch {
            showNotification('Delete failed', 'danger');
          }
        }
      });
    });
  }

  // Other functions remain same...
  async function refreshPasswords() {
    // ... existing code ...
  }

  async function refreshWorkNotes() {
    // ... existing code ...
  }

  async function refreshExcel() {
    // ... existing code ...
  }

  async function refreshAllSections() {
    await Promise.all([refreshPasswords(), refreshReminders(), refreshWorkNotes(), refreshExcel()]);
  }

  // Modal functions same...
  function showAddReminderModal() {
    // ... existing ...
  }

  // Button setup
  function setupButtons() {
    // ... existing ...
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupButtons();
    refreshAllSections();
    setInterval(refreshAllSections, 30000);
  });

})();

