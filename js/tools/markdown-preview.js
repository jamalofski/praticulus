(function() {
  'use strict';

  var STORAGE_KEY = 'tp-md-content';
  var DEFAULT_CONTENT = document.getElementById('editor').value;
  var editor = document.getElementById('editor');
  var preview = document.getElementById('preview');
  var saveTimer = null;

  // A content blocker, proxy or flaky network can keep the vendored bundle from loading.
  // Say so instead of dying on the first marked call (#3861).
  if (typeof marked === 'undefined' || typeof DOMPurify === 'undefined') {
    preview.innerHTML = '<div class="status-bar"><span class="invalid">Could not load the Markdown engine — check your connection or content blocker, then reload.</span></div>';
    return;
  }

  // L'editeur, l'autosave et les raccourcis ne dependent pas de marked : on
  // degrade le rendu au lieu de tuer le script sur la premiere ligne.
  var HAS_MD = typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined';
  if (HAS_MD) { marked.setOptions({ gfm: true, breaks: true }); }

  // Restore from localStorage
  var saved = localStorage.getItem(STORAGE_KEY);
  if (saved !== null) { editor.value = saved; }

  function renderPreview() {
    if (!HAS_MD) {
      preview.textContent = 'Renderer failed to load — reload the page. Your text is safe in the editor.';
      return;
    }
    preview.innerHTML = DOMPurify.sanitize(marked.parse(editor.value));
    if (typeof Prism !== 'undefined') { Prism.highlightAllUnder(preview); }
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function() {
      localStorage.setItem(STORAGE_KEY, editor.value);
    }, 500);
  }

  editor.addEventListener('input', function() {
    renderPreview();
    scheduleSave();
  });

  document.getElementById('btn-clear').addEventListener('click', function() {
    localStorage.removeItem(STORAGE_KEY);
    editor.value = DEFAULT_CONTENT;
    renderPreview();
  });

  document.getElementById('btn-copy-md').addEventListener('click', function() {
    navigator.clipboard.writeText(editor.value);
  });

  document.getElementById('btn-copy-html').addEventListener('click', function() {
    navigator.clipboard.writeText(preview.innerHTML);
  });

  document.getElementById('btn-download-html').addEventListener('click', function() {
    downloadText(preview.innerHTML, 'preview.html');
  });

  renderPreview();
})();
