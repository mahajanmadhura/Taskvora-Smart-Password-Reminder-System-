// PERFECT Recent Passwords - No \n, Clickable Buttons, Correct Counts

document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = window.location.origin + '/api';

  function getToken() { return localStorage.getItem('securepass_token'); }

  function sanitize(text) {
    return (text || '').replace(/[\n\r\t ]+/g, ' ').trim();
  }

  async function loadPasswords() {
    const token = getToken();
    if (!token) return [];

    try {
      const res = await fetch(`${API_BASE}/passwords`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      const data = await res.json();
      return data.success ? data.passwords.map(p => ({
        ...p,
        app_name: sanitize(p.app_name),
        username: sanitize(p.username),
        password: sanitize(p.password)
      })) : [];
    } catch {
      return [];
    }
  }

  async function refreshTable() {
    const tbody = document.getElementById('recentPasswordsTable');
    const totalEl = document.getElementById('totalPasswords');
    if (!tbody) return;

    const passwords = await loadPasswords();
    totalEl.textContent = passwords.length;

    if (!passwords.length) {
      tbody.innerHTML = '<tr><td colspan=6 class="text-center text-muted p-4">No passwords</td></tr>';
      return;
    }

    const recent = passwords.slice(-5).reverse();
    tbody.innerHTML = recent.map(pwd => {
      const exp = new Date(pwd.expiry_date).toLocaleDateString();
      const days = pwd.days_left || Math.floor((new Date(pwd.expiry_date) - Date.now()) / 86400000);
      const badge = days <= 0 ? 'bg-danger text-white' : days <= 7 ? 'bg-warning' : 'bg-success';
      const text = days <= 0 ? 'Expired' : `${days} days`;
      const id = pwd.id;

      return `<tr data-id="${id}">
        <td>${sanitize(pwd.app_name)}</td>
        <td>${sanitize(pwd.username)}</td>
        <td class="font-monospace fw-bold">${sanitize(pwd.password)}</td>
        <td>${exp}</td>
        <td><span class="badge ${badge}">${text}</span></td>
        <td class="text-end">
          <button class="btn btn-sm btn-danger delete-pwd" data-id="${id}">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>`;
    }).join('');

    // Buttons
    tbody.querySelectorAll('.delete-pwd').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('Delete?')) {
          const id = btn.dataset.id;
          const token = getToken();
          if (token) await fetch(`${API_BASE}/passwords/${id}`, { 
            method: 'DELETE', 
            headers: { Authorization: `Bearer ${token}` }
          });
          refreshTable();
        }
      });
    });
  }

  // Load + 30s refresh
  refreshTable();
  setInterval(refreshTable, 30000);

  // Add password buttons - ✅ HANDLED BY quick-buttons-handler.js
  // document.getElementById('addPasswordBtn')?.addEventListener('click', e => e.preventDefault());
  // document.getElementById('quickAddPassword')?.addEventListener('click', e => e.preventDefault());
});

