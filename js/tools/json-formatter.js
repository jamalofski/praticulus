(function() {
  'use strict';
  var input = document.getElementById('input');
  var output = document.getElementById('output');
  var status = document.getElementById('status');
  var indentSelect = document.getElementById('indent-select');
  var rawOutput = '';

  function getIndent() {
    var v = indentSelect.value;
    return v === 'tab' ? '\t' : parseInt(v);
  }

  function escHtml(s) { return escapeHtml(s); }

  function highlightJSON(line) {
    var h = escHtml(line);
    h = h.replace(/"([^"\\]*(\\.[^"\\]*)*)"\s*:/g, '<span class="json-key">"$1"</span>:');
    h = h.replace(/:\s*"([^"\\]*(\\.[^"\\]*)*)"/g, ': <span class="json-str">"$1"</span>');
    h = h.replace(/:\s*(-?\d+\.?\d*([eE][+-]?\d+)?)/g, ': <span class="json-num">$1</span>');
    h = h.replace(/:\s*(true|false|null)/g, ': <span class="json-bool">$1</span>');
    return h;
  }

  function renderWithLines(str) {
    return str.split('\n').map(function(line, i) {
      return '<div class="json-line"><span class="line-num">' + (i + 1) + '</span><span class="line-content">' + highlightJSON(line) + '</span></div>';
    }).join('');
  }

  function posToLineCol(text, pos) {
    var lines = text.substring(0, pos).split('\n');
    return { line: lines.length, col: lines[lines.length - 1].length + 1 };
  }

  function fmtError(e, text) {
    var m = e.message.match(/position\s+(\d+)/i);
    if (m && text) {
      var lc = posToLineCol(text, parseInt(m[1]));
      return 'Error at Line ' + lc.line + ', Col ' + lc.col + ': ' + escapeHtml(e.message);
    }
    return 'Error: ' + escapeHtml(e.message);
  }

  function formatJSON() {
    try {
      var parsed = JSON.parse(input.value);
      var formatted = JSON.stringify(parsed, null, getIndent());
      rawOutput = formatted;
      output.innerHTML = renderWithLines(formatted);
      setStatus('valid', 'Valid JSON — ' + countKeys(parsed) + ' keys, ' + formatted.length + ' chars');
    } catch (e) { setStatus('invalid', fmtError(e, input.value)); }
  }

  function minifyJSON() {
    try {
      var parsed = JSON.parse(input.value);
      var minified = JSON.stringify(parsed);
      rawOutput = minified;
      output.innerHTML = '<div class="json-line"><span class="line-num">1</span><span class="line-content">' + highlightJSON(minified) + '</span></div>';
      setStatus('valid', 'Minified — ' + minified.length + ' chars (saved ' + (input.value.length - minified.length) + ')');
    } catch (e) { setStatus('invalid', fmtError(e, input.value)); }
  }

  function validateJSON() {
    try {
      var parsed = JSON.parse(input.value);
      var desc = typeof parsed === 'object' ? (Array.isArray(parsed) ? 'Array with ' + parsed.length + ' items' : 'Object with ' + Object.keys(parsed).length + ' keys') : typeof parsed;
      setStatus('valid', '\u2713 Valid JSON — ' + desc);
    } catch (e) { setStatus('invalid', fmtError(e, input.value)); }
  }

  function clearAll() { input.value = ''; rawOutput = ''; output.textContent = 'Formatted JSON will appear here...'; status.innerHTML = ''; }
  function copyOutput() { navigator.clipboard.writeText(rawOutput || output.textContent); }
  function downloadOutput() { downloadText(rawOutput || output.textContent, 'formatted.json'); }
  function setStatus(type, msg) { status.innerHTML = '<span class="' + type + '">' + msg + '</span>'; }

  function countKeys(obj) {
    if (typeof obj !== 'object' || obj === null) return 0;
    var c = 0; for (var k in obj) { c++; if (typeof obj[k] === 'object') c += countKeys(obj[k]); }
    return c;
  }

  document.getElementById('btn-format').addEventListener('click', formatJSON);
  document.getElementById('btn-minify').addEventListener('click', minifyJSON);
  document.getElementById('btn-validate').addEventListener('click', validateJSON);
  document.getElementById('btn-clear').addEventListener('click', clearAll);
  document.getElementById('btn-copy').addEventListener('click', copyOutput);
  document.getElementById('btn-download').addEventListener('click', downloadOutput);

  document.getElementById('btn-upload').addEventListener('click', function() { document.getElementById('file-upload').click(); });
  document.getElementById('file-upload').addEventListener('change', function(e) {
    var f = e.target.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function(ev) { input.value = ev.target.result; formatJSON(); };
    r.readAsText(f); e.target.value = '';
  });

  input.addEventListener('paste', function() { setTimeout(formatJSON, 50); });
})();
