// FULL Working Buttons with Forms - No Conflicts

document.addEventListener('DOMContentLoaded', () => {
// ✅ DUPLICATE HANDLERS DISABLED - Using quick-buttons-handler.js
  // window.showAddReminderOverlay = null;
  // window.showWorkNotesOverlay = null;

  // Add Password handlers MOVED to quick-buttons-handler.js
  // document.getElementById('addPasswordBtn')?.addEventListener('click', e => {
  //   e.preventDefault();
  //   window.dashboard?.showAddPasswordModal?.();
  // });

  // Add Reminder - Simple form
  ['addReminderBtn', 'quickAddReminder'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', e => {
      e.preventDefault();
      showReminderForm();
    });
  });

  // Work Notes form
  // Excel upload
  document.getElementById('quickUploadExcel')?.addEventListener('click', e => {
    e.preventDefault();
    document.getElementById('excelFileInput')?.click();
  });
});

function showReminderForm() {
  const html = `
    <div class="modal fade" id="reminderModal">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5>Add Reminder</h5>
            <button class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <input type="text" id="remTitle" class="form-control mb-2" placeholder="Title">
            <input type="date" id="remDate" class="form-control mb-2">
            <textarea id="remDesc" class="form-control" placeholder="Description"></textarea>
          </div>
          <div class="modal-footer">
            <button class="btn btn-primary" onclick="saveReminder()">Save</button>
          </div>
        </div>
      </div>
    </div>`;
  
  document.body.insertAdjacentHTML('beforeend', html);
  const modal = new bootstrap.Modal(document.getElementById('reminderModal'));
  modal.show();
  document.getElementById('reminderModal').addEventListener('hidden.bs.modal', () => {
    document.getElementById('reminderModal')?.remove();
  });
}

async function saveReminder() {
  const title = document.getElementById('remTitle').value;
  const date = document.getElementById('remDate').value;
  const desc = document.getElementById('remDesc').value;
  
  if (!title || !date) return alert('Title and date required');

  const token = localStorage.getItem('securepass_token');
  await fetch(`${window.location.origin}/api/reminders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title, reminder_date: date, description: desc })
  });

  bootstrap.Modal.getInstance(document.getElementById('reminderModal')).hide();
  alert('Reminder saved!');
}

function showWorkNotesForm() {
  const html = `
    <div class="modal fade" id="notesModal">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5>Work Notes</h5>
            <button class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <input type="text" id="noteTitle" class="form-control mb-2" placeholder="Title">
            <textarea id="noteContent" class="form-control" rows="4" placeholder="Content"></textarea>
          </div>
          <div class="modal-footer">
            <button class="btn btn-warning" onclick="saveNote()">Save Note</button>
          </div>
        </div>
      </div>
    </div>`;
  
  document.body.insertAdjacentHTML('beforeend', html);
  const modal = new bootstrap.Modal(document.getElementById('notesModal'));
  modal.show();
  document.getElementById('notesModal').addEventListener('hidden.bs.modal', () => {
    document.getElementById('notesModal')?.remove();
  });
}

async function saveNote() {
  const title = document.getElementById('noteTitle').value;
  const content = document.getElementById('noteContent').value;
  
  if (!title || !content) return alert('Title and content required');

  const token = localStorage.getItem('securepass_token');
  await fetch(`${window.location.origin}/api/worknotes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title, content })
  });

  bootstrap.Modal.getInstance(document.getElementById('notesModal')).hide();
  alert('Note saved!');
}

