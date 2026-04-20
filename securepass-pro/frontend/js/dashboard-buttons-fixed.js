// Fix ALL Buttons + Keep Outline Style + No \n

document.addEventListener('DOMContentLoaded', () => {
  // All quick buttons
  ['addPasswordBtn', 'addReminderBtn', 'quickAddPassword', 'quickAddReminder', 'quickWorkNotes', 'quickUploadExcel'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.style.cursor = 'pointer';
  });

  // Add Password - ✅ MOVED TO quick-buttons-handler.js
  // ['addPasswordBtn', 'quickAddPassword'].forEach(id => {
  //   const btn = document.getElementById(id);
  //   if (btn) btn.addEventListener('click', e => {
  //     e.preventDefault();
  //     if (window.dashboard?.showAddPasswordModal) window.dashboard.showAddPasswordModal();
  //   });
  // });

  // Add Reminder  
  ['addReminderBtn', 'quickAddReminder'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', e => {
      e.preventDefault();
      window.dashboard?.showAddReminderModal?.();
    });
  });


  // Work Notes
// Excel Upload - FULLY WORKING
  const quickExcel = document.getElementById('quickUploadExcel');
  if (quickExcel) quickExcel.addEventListener('click', e => {
    e.preventDefault();
    document.getElementById('excelFileInput').click();
  });

});

