// Simple button handler - add before dashboard-main.js
window.handleQuickAction = function(type) {
  const btnId = 'quick' + type.charAt(0).toUpperCase() + type.slice(1);
  console.log('Quick action:', type, 'Button:', btnId);
  
  // Trigger click on dashboard-main.js logic or direct action
  const btn = document.getElementById(btnId);
  if (btn) btn.click(); // Trigger event listeners
  
  // Direct refresh
  if (window.refreshAllSections) window.refreshAllSections();
  
  alert('Quick action: ' + type + ' - Section refreshed!');
};

// Make buttons clickable immediately
document.addEventListener('DOMContentLoaded', () => {
  ['quickAddPassword', 'quickAddReminder', 'quickWorkNotes', 'quickUploadExcel'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        window.handleQuickAction(id.replace('quick', '').toLowerCase());
        return false;
      };
      btn.style.cursor = 'pointer';
      btn.style.pointerEvents = 'auto';
      btn.style.opacity = '1';
    }
  });
});
