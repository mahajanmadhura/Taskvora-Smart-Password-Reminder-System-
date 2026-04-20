// FINAL: Plain passwords, NO \n, NO View button, Delete only

document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = window.location.origin + '/api';

  function getToken() { return localStorage.getItem('securepass_token'); }

  function cleanPassword(pwd) {
    return (pwd || '').replace(/[\n\r\t]/g, ' ').trim();
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
        passwords = data.success 
  ? data.passwords.map(p => ({
      ...p,
      app_name: (p.app_name || '').replace(/[\n\r\t]/g, ''),
      username: (p.username || '').replace(/[\n\r\t]/g, ''),
      password: (p.password || '').replace(/[\n\r\t]/g, '')
    }))
  : [];

       
      } catch (e) {
        passwords = JSON.parse(localStorage.getItem('securepass_local_passwords') || '[]');
      }
    }

    document.getElementById('totalPasswords').textContent = passwords.length;

    if (!passwords.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No passwords added yet</td></tr>';
      return;
    }

    tbody.innerHTML = passwords.slice(-5).reverse().map(pwd => {
      const expDate = new Date(pwd.expiry_date).toLocaleDateString();
      const daysLeft = pwd.days_left || Math.floor((new Date(pwd.expiry_date) - Date.now()) / 86400000);
      const badgeClass = daysLeft <= 0 ? 'bg-danger' : daysLeft <= 7 ? 'bg-warning' : daysLeft <= 30 ? 'bg-info' : 'bg-success';
      const badgeText = daysLeft <= 0 ? 'Expired' : `${daysLeft} days`;
      const id = pwd.id || pwd._id || 'local-' + Math.random();

      return `<tr data-id="${id}">
        <td>${pwd.app_name || ''}</td>
        <td>${pwd.username || ''}</td>
        <td style="font-family: monospace; font-weight: bold;">${cleanPassword(pwd.password)}</td>
        <td>${expDate}</td>
        <td><span class="badge ${badgeClass}">${badgeText}</span></td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-danger recent-pwd-delete" title="Delete" data-id="${id}">
            <i class="fas fa-trash-alt"></i>
          </button>
        </td>
      </tr>`;
    }).join('');

    // Delete handlers
    tbody.querySelectorAll('.recent-pwd-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('Delete this password?')) {
          const id = btn.closest('tr').dataset.id;
          const token = getToken();
          if (token) {
            await fetch(`${API_BASE}/passwords/${id}`, { 
              method: 'DELETE', 
              headers: { Authorization: `Bearer ${token}` } 
            });
          }
          document.querySelector('.card-body').childNodes.forEach(node => {
  if (node.nodeType === 3) node.remove(); // remove text nodes like \n
});
          refreshRecentPasswords();
        }
      });
    });
  }

  // Initial load + auto refresh
  refreshRecentPasswords();
  setInterval(refreshRecentPasswords, 10000);

  // Add password buttons
  document.querySelectorAll('#addPasswordBtn, #quickAddPassword').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      window.dashboard?.showAddPasswordModal?.();
    });
  });
});
