// COMPLETE Dashboard Fix - All Buttons + Clean Table + Counts

(function() {
  'use strict';

  const API_BASE = window.location.origin + '/api';

  function getToken() {
    return localStorage.getItem('securepass_token');
  }

  function sanitize(text) {
    return (text || '').replace(/[\n\r\t\s]+/g, ' ').trim();
  }

  // Quick buttons - ALL WORK
  function setupButtons() {
    // Add Password
    ['addPasswordBtn', 'quickAddPassword'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', e => {
        e.preventDefault();
        // Use existing modal
        if (window.dashboard?.showAddPasswordModal) window.dashboard.showAddPasswordModal();
      });
    });

    // Add Reminder
    ['addReminderBtn', 'quickAddReminder'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', e => {
        e.preventDefault();
        window.showAddReminderOverlay?.();
      });
    });

    // Work Notes
    const workBtn = document.getElementById('quickWorkNotes');
    if (workBtn) workBtn.addEventListener('click', e => {
      e.preventDefault();
      window.showWorkNotesOverlay?.();
    });

    // Excel
    const excelBtn = document.getElementById('quickUploadExcel');
    if (excelBtn) excelBtn.addEventListener('click', e => {
      e.preventDefault();
      document.getElementById('excelFileInput')?.click();
    });
  }

  // Clean recent passwords table
  async function refreshRecentTable() {
    const tbody = document.getElementById('recentPasswordsTable');
    const totalEl = document.getElementById('totalPasswords');
    if (!tbody) return;

    const token = getToken();
    let passwords = [];

    if (token) {
      try {
        const res = await fetch(`${API_BASE}/passwords`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        passwords = data.success ? data.passwords.map(p => ({
          ...p,
          app_name: sanitize(p.app_name),
          username: sanitize(p.username),
          password: sanitize(p.password)
        })) : [];
      } catch {}
    }

    totalEl.textContent = passwords.length;

    if (!passwords.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted p-4">No passwords added yet</td></tr>';
      return;
    }

    const recent = passwords.slice(-5).reverse();
    tbody.innerHTML = recent.map(pwd => {
      const exp = new Date(pwd.expiry_date).toLocaleDateString();
      const days = pwd.days_left || Math.floor((new Date(pwd.expiry_date) - Date.now()) / 86400000);
      const badgeClass = days <= 0 ? 'bg-danger' : days <= 7 ? 'bg-warning' : days <= 30 ? 'bg-info' : 'bg-success';
      const badgeText = days <= 0 ? 'Expired' : `${days}d`;
      const id = pwd.id;

      return `<tr data-id="${id}">
        <td>${sanitize(pwd.app_name)}</td>
        <td>${sanitize(pwd.username)}</td>
        <td class="font-monospace small">${sanitize(pwd.password)}</td>
        <td>${exp}</td>
        <td><span class="badge ${badgeClass}">${badgeText}</span></td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-danger delete-btn" title="Delete" data-id="${id}">
            <i class="fas fa-trash-alt"></i>
          </button>
        </td>
      </tr>`;
    }).join('');

    // Delete buttons
    tbody.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        if (confirm('Delete this password?')) {
          const id = btn.dataset.id;
          const token = getToken();
          if (token) {
            await fetch(`${API_BASE}/passwords/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` }
            });
          }
          btn.closest('tr').remove();
          if (tbody.children.length === 0) refreshRecentTable();
        }
      });
    });
  }

  // Init
  setupButtons();
  refreshRecentTable();
  setInterval(refreshRecentTable, 30000);
})();

