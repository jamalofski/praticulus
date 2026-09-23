(function() {
  'use strict';

  var STORAGE_KEY = 'tp-md2html';
  var editor = document.getElementById('editor');
  var out = document.getElementById('out');

  // A content blocker, proxy or flaky network can keep the vendored bundle from loading.
  // Say so instead of dying on the first marked call (#3861).
  if (typeof marked === 'undefined' || typeof DOMPurify === 'undefined') {
    out.innerHTML = '<div class="status-bar"><span class="invalid">Could not load the Markdown engine — check your connection or content blocker, then reload.</span></div>';
    return;
  }

  // Meme garde que markdown-preview : l'editeur survit a un vendor absent.
  var HAS_MD = typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined';
  if (HAS_MD) { marked.setOptions({ gfm: true, breaks: false }); }
  var optTw = document.getElementById('opt-tailwind');
  var tabCode = document.getElementById('tab-code');
  var tabPreview = document.getElementById('tab-preview');
  var view = 'code';
  var currentHTML = '';

  var TW = {
    H1: 'text-3xl font-bold mb-4', H2: 'text-2xl font-bold mt-6 mb-3', H3: 'text-xl font-semibold mt-4 mb-2',
    H4: 'text-lg font-semibold mt-4 mb-2', P: 'mb-4 leading-relaxed', A: 'text-blue-600 underline',
    UL: 'list-disc pl-6 mb-4', OL: 'list-decimal pl-6 mb-4', LI: 'mb-1',
    BLOCKQUOTE: 'border-l-4 border-gray-300 pl-4 italic my-4', PRE: 'bg-gray-100 rounded p-4 overflow-x-auto mb-4 text-sm',
    CODE: 'font-mono', TABLE: 'table-auto border-collapse my-4 w-full', THEAD: 'bg-gray-100',
    TH: 'border px-3 py-2 text-left', TD: 'border px-3 py-2', HR: 'my-6 border-gray-300', IMG: 'max-w-full h-auto'
  };

  function addTailwind(html) {
    var tpl = document.createElement('template');
    tpl.innerHTML = html;
    tpl.content.querySelectorAll('*').forEach(function (el) {
      var c = TW[el.tagName];
      if (c) el.className = el.className ? el.className + ' ' + c : c;
    });
    return tpl.innerHTML;
  }

  function build() {
    if (!HAS_MD) {
      out.textContent = 'Converter failed to load — reload the page. Your text is safe in the editor.';
      return;
    }
    var raw = DOMPurify.sanitize(marked.parse(editor.value));
    currentHTML = optTw.checked ? addTailwind(raw) : raw;
    if (view === 'preview') {
      out.innerHTML = raw;
      if (typeof Prism !== 'undefined') Prism.highlightAllUnder(out);
    } else {
      out.innerHTML = '';
      var pre = document.createElement('pre');
      var code = document.createElement('code');
      code.className = 'language-markup';
      code.textContent = currentHTML;
      pre.appendChild(code);
      out.appendChild(pre);
      if (typeof Prism !== 'undefined') Prism.highlightElement(code);
    }
    try { localStorage.setItem(STORAGE_KEY, editor.value); } catch (e) {}
  }

  function setView(v) {
    view = v;
    tabCode.classList.toggle('btn-primary', v === 'code');
    tabCode.classList.toggle('btn-secondary', v !== 'code');
    tabPreview.classList.toggle('btn-primary', v === 'preview');
    tabPreview.classList.toggle('btn-secondary', v !== 'preview');
    build();
  }

  var saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
  if (saved !== null) editor.value = saved;

  editor.addEventListener('input', build);
  optTw.addEventListener('change', build);
  tabCode.addEventListener('click', function () { setView('code'); });
  tabPreview.addEventListener('click', function () { setView('preview'); });
  document.getElementById('btn-copy').addEventListener('click', function () { copyToClipboard(currentHTML, this); });
  document.getElementById('btn-download').addEventListener('click', function () { downloadText(currentHTML, 'converted.html'); });

  setView('code');
})();
