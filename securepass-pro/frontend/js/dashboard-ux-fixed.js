// CLEAN Recent Passwords - No \n, Plain Passwords, Accurate Days

document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = window.location.origin + '/api';

  function getToken() { return localStorage.getItem('securepass_token'); }

  function cleanText(text) {
    return (text || '').replace(/[\n\r\t\s]{2,}/g, ' ').trim();
  }

  async function refreshRecentPasswords() {
    const tbody = document.getElementById('recentPasswordsTable');
    if (!tbody) return;

    const token = getToken();
    let passwords = [];

    if (!token) {
      passwords = JSON.parse(localStorage.getItem('securepass_local_passwords') || '[]');
    } else {
      try {
        const res = await fetch(`${API_BASE}/passwords`, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        const data = await res.json();
        passwords = data.success ? data.passwords.map(p => ({
          ...p,
          app_name: cleanText(p.app_name),
          username: cleanText(p.username),
          password: cleanText(p.password)
        })) : [];
      } catch (e) {
        passwords = JSON.parse(localStorage.getItem('securepass_local_passwords') || '[]');
      }
    }

    document.getElementById('totalPasswords').textContent = passwords.length;

    if (!passwords.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No passwords added yet</td></tr>';
      return;
    }

    // Latest 5
    const recent = passwords.slice(-5).reverse();
    let html = '';

    recent.forEach(pwd => {
      const expDate = new Date(pwd.expiry_date).toLocaleDateString();
      const daysLeft = pwd.days_left || Math.floor((new Date(pwd.expiry_date) - Date.now()) / (1000 * 60 * 60 * 24));
      const badgeClass = daysLeft <= 0 ? 'bg-danger' : daysLeft <= 7 ? 'bg-warning' : daysLeft <= 30 ? 'bg-info' : 'bg-success';
      const badgeText = daysLeft <= 0 ? 'Expired' : daysLeft + ' days';
      const id = pwd.id || pwd._id || Date.now();

      html += `
        <tr data-id="${id}">
          <td>${pwd.app_name || ''}</td>
          <td>${pwd.username || ''}</td>
          <td class="font-monospace fw-bold">${pwd.password}</td>
          <td>${expDate}</td>
          <td><span class="badge ${badgeClass}">${badgeText}</span></td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-danger delete-btn" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>`;
    });

    tbody.innerHTML = html;

    // Delete
    tbody.querySelectorAll('.delete-btn').forEach(btn => {
      btn.onclick = async () => {
        if (confirm('Delete password?')) {
          const tr = btn.closest('tr');
          const id = tr.dataset.id;
          if (token) {
            await fetch(`${API_BASE}/passwords/${id}`, { 
              method: 'DELETE', 
              headers: { Authorization: `Bearer ${token}` }
            });
          }
          tr.remove();
          if (tbody.children.length === 0) refreshRecentPasswords();
        }
      };
    });
  }

  refreshRecentPasswords();
  setInterval(refreshRecentPasswords, 30000); // 30s

  // Add buttons
  ['addPasswordBtn', 'quickAddPassword'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.onclick = e => {
      e.preventDefault();
      (window.dashboard || {}).showAddPasswordModal?.();
    };
  });
});

