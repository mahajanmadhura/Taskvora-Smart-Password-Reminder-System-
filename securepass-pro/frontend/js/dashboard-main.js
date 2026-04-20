// Fixed - Full complete dashboard-main.js with raw sanitize & proper table
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

  // Refresh Passwords - Full clean table like reminders
  async function refreshPasswords() {
    const tbody = document.getElementById('recentPasswordsTable');
    const totalEl = document.getElementById('totalPasswords');
    if (!tbody) return;

    try {
      const res = await fetch(`${API_BASE}/passwords`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      console.log('Passwords API response:', data);
      const passwords = data.success ? data.passwords : [];

      console.log('Processed passwords:', passwords);
      totalEl.textContent = passwords.length;

      if (!passwords.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted p-4">No passwords added yet</td></tr>';
        return;
      }

      const rows = passwords.map(pwd => {
        const exp = new Date(pwd.expiry_date).toLocaleDateString();
        const id = pwd._id || pwd.id;
        return `
          <tr data-id="${id}">
            <td>${sanitize(pwd.username)}</td>
            <td class="font-monospace small">${sanitize(pwd.password)}</td>
            <td>${exp}</td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-danger delete-password" data-id="${id}" title="Delete">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>`;
      }).join('');

      tbody.innerHTML = rows;

      tbody.querySelectorAll('.delete-password').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (confirm('Delete this password?')) {
            const id = btn.dataset.id;
            const token = getToken();
            try {
              const res = await fetch(`${API_BASE}/passwords/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
              });
              if (res.ok) {
                btn.closest('tr').remove();
                totalEl.textContent = Math.max(0, parseInt(totalEl.textContent) - 1);
                showNotification('Password deleted successfully', 'success');
              } else {
                showNotification('Delete failed', 'danger');
              }
            } catch (e) {
              showNotification('Delete failed', 'danger');
            }
          }
        });
      });
    } catch (err) {
      console.error('Refresh passwords error:', err);
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger p-4">Error loading passwords</td></tr>';
    }
  }

  // Refresh Reminders - Full clean table
  async function refreshReminders() {
    const list = document.getElementById('remindersList');
    const countEl = document.getElementById('activeReminders');
    if (!list) return;

    const data = await apiFetch('/reminders');
    const reminders = data.success ? data.reminders : [];



  if (countEl) countEl.textContent = reminders.length;

  if (!reminders.length) {
    list.innerHTML = '';
    document.getElementById('noRemindersMessage').style.display = 'block';
    return;
  }
  document.getElementById('noRemindersMessage').style.display = 'none';




    const rows = reminders.map(r => {
      const exp = new Date(r.reminder_date).toLocaleDateString();
      const id = r._id;
      return `
        <tr data-id="${id}">
          <td>${sanitize(r.title)}</td>
          <td>${sanitize(r.description)}</td>
          <td>${exp}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-danger delete-reminder" data-id="${id}" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>`;
    }).join('');

    list.innerHTML = `
      <table class="table table-hover">
        <thead>
          <tr>
            <th>Title</th>
            <th>Description</th>
            <th>Expires</th>
            <th class="text-end">Action</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;

    list.querySelectorAll('.delete-reminder').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('Delete this reminder?')) {
          const id = btn.dataset.id;
          const token = getToken();
          try {
            const res = await fetch(`${API_BASE}/reminders/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
              btn.closest('tr').remove();
              if (countEl) countEl.textContent = Math.max(0, parseInt(countEl.textContent) - 1);
            } else {
              showNotification('Delete failed', 'danger');
            }
          } catch (e) {
            showNotification('Delete failed', 'danger');
          }
        }
      });
    });
  }

  // Refresh Work Notes - Table format like reminders
  async function refreshWorkNotes() {
    const countEl = document.getElementById('emailCount') || document.getElementById('workNotesCount');
    const listEl = document.getElementById('workNotesList');
    const noNotesEl = document.getElementById('noWorkNotesMessage');
    if (!countEl || !listEl) return;

    const data = await apiFetch('/worknotes');
    console.log('Work notes API response:', data);
    const notes = data.success ? data.notes : [];
    console.log('Processed work notes:', notes);
    countEl.textContent = notes.length;

    if (!notes.length) {
      listEl.innerHTML = '';
      if (noNotesEl) noNotesEl.style.display = 'block';
      return;
    }

    if (noNotesEl) noNotesEl.style.display = 'none';

    const rows = notes.map(n => {
      const date = new Date(n.note_date).toLocaleDateString();
      const id = n._id || n.id;
      return `
        <tr data-id="${id}">
          <td>${sanitize(n.title)}</td>
          <td>${sanitize(n.content)}</td>
          <td>${date}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-danger delete-work-note" data-id="${id}" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>`;
    }).join('');

    listEl.innerHTML = `
      <table class="table table-hover">
        <thead>
          <tr>
            <th>Title</th>
            <th>Content</th>
            <th>Date</th>
            <th class="text-end">Action</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;

    listEl.querySelectorAll('.delete-work-note').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('Delete this work note?')) {
          const id = btn.dataset.id;
          const token = getToken();
          try {
            const res = await fetch(`${API_BASE}/worknotes/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
              btn.closest('tr').remove();
              countEl.textContent = Math.max(0, parseInt(countEl.textContent) - 1);
              showNotification('Work note deleted successfully', 'success');
              if (!listEl.querySelector('tr')) {
                listEl.innerHTML = '';
                if (noNotesEl) noNotesEl.style.display = 'block';
              }
            } else {
              showNotification('Delete failed', 'danger');
            }
          } catch (e) {
            showNotification('Delete failed', 'danger');
          }
        }
      });
    });
  }

  // Refresh Excel
  async function refreshExcel() {
    const list = document.getElementById('excelFilesList');
    if (!list) return;

    const data = await apiFetch('/files');
    console.log('Excel files API response:', data);
    const files = data.success ? data.files : [];
    console.log('Processed files:', files);

    if (!files.length) {
      list.innerHTML = '<p class="text-muted mb-0 small">No Excel files uploaded yet.</p>';
      return;
    }

    list.innerHTML = files.map(f => {
      return `
        <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
          <div>
            <i class="fas fa-file-excel text-success me-2"></i>
            ${sanitize(f.filename)}
          </div>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-success download-file" data-id="${f.id}">
              <i class="fas fa-download"></i>
            </button>
            <button class="btn btn-outline-danger delete-file" data-id="${f.id}">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>`;
    }).join('');

    // Download
    list.querySelectorAll('.download-file').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const filename = btn.closest('.d-flex').querySelector('i').nextSibling.textContent.trim();
        try {
          const res = await fetch(`/api/files/${id}/download`, {
            headers: { Authorization: `Bearer ${getToken()}` }
          });
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
        } catch {
          showNotification('Download failed', 'danger');
        }
      });
    });

    // Delete
    list.querySelectorAll('.delete-file').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('Delete file?')) {
          const id = btn.dataset.id;
          const token = getToken();
          try {
            const res = await fetch(`${API_BASE}/files/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
              btn.closest('.d-flex').remove();
              showNotification('File deleted successfully', 'success');
              if (!list.querySelector('.d-flex')) {
                list.innerHTML = '<p class="text-muted mb-0 small">No Excel files uploaded yet.</p>';
              }
            } else {
              showNotification('Delete failed', 'danger');
            }
          } catch (e) {
            showNotification('Delete failed', 'danger');
          }
        }
      });
    });
  }

  async function refreshAllSections() {
    refreshPasswords();
    refreshReminders();
    refreshWorkNotes();
    refreshExcel();
  }

  // All 4 buttons handlers
  function setupButtons() {
    // Quick Add Password
    ['quickAddPassword', 'addPasswordBtn'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', e => {
        e.preventDefault();
        showAddPasswordModal();
      });
    });

    // Quick Add Reminder
    ['quickAddReminder', 'addReminderBtn'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', e => {
        e.preventDefault();
        showAddReminderModal();
      });
    });

    // Quick Work Notes
    const workBtn = document.getElementById('quickWorkNotes');
    if (workBtn) workBtn.addEventListener('click', e => {
      e.preventDefault();
      showAddWorkNoteModal();
    });

    // Excel Upload
    const excelBtn = document.getElementById('quickUploadExcel');
    const fileInput = document.getElementById('excelFileInput');
    if (excelBtn) excelBtn.addEventListener('click', e => {
      e.preventDefault();
      fileInput.click();
    });

    if (fileInput) fileInput.addEventListener('change', async e => {
      const file = e.target.files[0];
      if (file) {
        const formData = new FormData();
        formData.append('excelFile', file);
        try {
          const res = await fetch(`${API_BASE}/files/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${getToken()}` },
            body: formData
          });
          if (res.ok) {
            showNotification('Excel uploaded!', 'success');
            e.target.value = '';
            refreshExcel();
          }
        } catch {
          showNotification('Upload failed', 'danger');
        }
      }
    });

    // Style buttons
    document.querySelectorAll('.quick-action-btn').forEach(btn => {
      btn.style.cursor = 'pointer';
    });
  }

  // Modals (full implementations)
  function showAddPasswordModal() {
    const html = `
      <div class="modal fade" id="passwordModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Add Password</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label">Application</label>
                <input type="text" class="form-control" id="appName" required>
              </div>
              <div class="mb-3">
                <label class="form-label">Username</label>
                <input type="text" class="form-control" id="pwdUsername" required>
              </div>
              <div class="mb-3">
                <label class="form-label">Password</label>
                <input type="password" class="form-control" id="pwdPassword" required>
              </div>
              <div class="mb-3">
                <label class="form-label">Expires</label>
                <input type="date" class="form-control" id="pwdExpiry" required>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-primary" onclick="window.savePassword()">Save</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    const modal = new bootstrap.Modal(document.getElementById('passwordModal'));
    modal.show();
  }

  window.savePassword = async () => {
    const formData = {
      app_name: document.getElementById('appName').value,
      username: document.getElementById('pwdUsername').value,
      password: document.getElementById('pwdPassword').value,
      expiry_date: document.getElementById('pwdExpiry').value
    };
    console.log('Saving password with data:', formData);
    const token = getToken();
    try {
      const res = await fetch(`${API_BASE}/passwords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      console.log('Save password response:', data);
      if (data.success) {
        bootstrap.Modal.getInstance(document.getElementById('passwordModal')).hide();
        showNotification('Password saved successfully!', 'success');
        console.log('Calling refreshPasswords...');
        await refreshPasswords();
      } else {
        showNotification(data.message || 'Save failed', 'danger');
      }
    } catch (err) {
      console.error('Save password error:', err);
      showNotification('Save failed: ' + err.message, 'danger');
    }
  };

  function showAddReminderModal() {
    const html = `
      <div class="modal fade" id="reminderModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Add Reminder</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label">Title</label>
                <input type="text" class="form-control" id="remTitle" required>
              </div>
              <div class="mb-3">
                <label class="form-label">Date</label>
                <input type="date" class="form-control" id="remDate" required>
              </div>
              <div class="mb-3">
                <label class="form-label">Description</label>
                <textarea class="form-control" id="remDesc" rows="3"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-warning" onclick="window.saveReminder()">Save</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    const modal = new bootstrap.Modal(document.getElementById('reminderModal'));
    modal.show();
  }

  window.saveReminder = async () => {
    const formData = {
      title: document.getElementById('remTitle').value,
      reminder_date: document.getElementById('remDate').value,
      description: document.getElementById('remDesc').value
    };
    const token = getToken();
    try {
      const res = await fetch(`${API_BASE}/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        bootstrap.Modal.getInstance(document.getElementById('reminderModal')).hide();
        showNotification('Reminder saved successfully!', 'success');
        refreshReminders();
      } else {
        showNotification(data.message || 'Save failed', 'danger');
      }
    } catch (err) {
      console.error('Save reminder error:', err);
      showNotification('Save failed: ' + err.message, 'danger');
    }
  };

  function showAddWorkNoteModal() {
    const html = `
      <div class="modal fade" id="workNoteModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Add Work Note</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label">Title</label>
                <input type="text" class="form-control" id="noteTitle" required>
              </div>
              <div class="mb-3">
                <label class="form-label">Content</label>
                <textarea class="form-control" id="noteContent" rows="4" required></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-info" onclick="window.saveWorkNote()">Save</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    const modal = new bootstrap.Modal(document.getElementById('workNoteModal'));
    modal.show();
  }

  window.saveWorkNote = async () => {
    const formData = {
      title: document.getElementById('noteTitle').value,
      content: document.getElementById('noteContent').value
    };
    const token = getToken();
    try {
      const res = await fetch(`${API_BASE}/worknotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        bootstrap.Modal.getInstance(document.getElementById('workNoteModal')).hide();
        showNotification('Work note saved successfully!', 'success');
        refreshWorkNotes();
      } else {
        showNotification(data.message || 'Save failed', 'danger');
      }
    } catch (err) {
      console.error('Save work note error:', err);
      showNotification('Save failed: ' + err.message, 'danger');
    }
  };

  // Init
  document.addEventListener('DOMContentLoaded', () => {
    setupButtons();
    refreshAllSections();
    setInterval(refreshAllSections, 30000);
  });
})();

