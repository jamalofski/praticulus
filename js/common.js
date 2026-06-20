/* Praticulus — Common utilities */

function copyToClipboard(text, btn) {
  navigator.clipboard.writeText(text).then(function () {
    showToast('Copied!');
    if (btn) {
      var orig = btn.textContent;
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(function () {
        btn.textContent = orig;
        btn.classList.remove('copied');
      }, 1500);
    }
  });
}

function showToast(message) {
  var existing = document.querySelector('.copy-toast');
  if (existing) existing.remove();
  var toast = document.createElement('div');
  toast.className = 'copy-toast';
  toast.textContent = message || 'Copied!';
  document.body.appendChild(toast);
  requestAnimationFrame(function () {
    toast.classList.add('copy-toast--visible');
  });
  setTimeout(function () {
    toast.classList.remove('copy-toast--visible');
    setTimeout(function () { toast.remove(); }, 300);
  }, 1800);
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function downloadText(text, filename) {
  var blob = new Blob([text], { type: 'text/plain' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
