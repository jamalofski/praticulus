(function() {
  'use strict';
  var input = document.getElementById('input');
  var output = document.getElementById('output');
  var status = document.getElementById('status');
  var dialectSelect = document.getElementById('dialect-select');
  var indentSelect = document.getElementById('indent-select');
  var caseSelect = document.getElementById('case-select');
  var rawOutput = '';

  var SAMPLE = "select u.id, u.email, count(o.id) as order_count from users u left join orders o on o.user_id = u.id where u.created_at > '2026-01-01' group by u.id, u.email having count(o.id) > 5 order by order_count desc;";
  var SAMPLE_FORMATTED = "SELECT\n  u.id,\n  u.email,\n  count(o.id) AS order_count\nFROM\n  users u\n  LEFT JOIN orders o ON o.user_id = u.id\nWHERE\n  u.created_at > '2026-01-01'\nGROUP BY\n  u.id,\n  u.email\nHAVING\n  count(o.id) > 5\nORDER BY\n  order_count DESC;";

  function indentOpts() {
    var v = indentSelect.value;
    if (v === 'tab') return { useTabs: true, tabWidth: 2 };
    return { useTabs: false, tabWidth: parseInt(v, 10) };
  }

  function setStatus(type, msg) { status.innerHTML = '<span class="' + type + '">' + msg + '</span>'; }
  function showOutput(text) { rawOutput = text; output.textContent = text; }
  function statusFor(text) { setStatus('valid', '✓ Formatted — ' + text.split('\n').length + ' lines, ' + text.length + ' chars'); }

  // Lazy-load the formatting engine (~320 KB) the first time it's actually
  // needed — the initial page load stays free of it (perf budget), and the
  // hand-rolled minifier works without it.
  var libInjected = false, libCb = null;
  function ensureLib(cb) {
    if (window.sqlFormatter) { cb(); return; }
    libCb = cb;
    if (libInjected) return;
    libInjected = true;
    var s = document.createElement('script');
    s.src = '/js/vendor/sql-formatter.min.js?v=20260824a';
    // #3797/#3861: hide extension-injected define()/module so the UMD lib attaches to window.
    // Clearing fails silently on a non-writable/getter-only define — then strip .amd instead.
    var _d = window.define, _m = window.module, _e = window.exports, _o = null, _amd;
    try { window.define = window.module = window.exports = undefined; } catch (e) {}
    if (typeof window.define === 'function' && window.define.amd) {
      _o = window.define; _amd = _o.amd;
      try { _o.amd = undefined; if (_o.amd) delete _o.amd; } catch (e) {}
    }
    function restoreDefs() {
      try { window.define = _d; } catch (e) {}
      try { window.module = _m; } catch (e) {}
      try { window.exports = _e; } catch (e) {}
      if (_o) { try { _o.amd = _amd; } catch (e) {} }
    }
    function libFailed() { libInjected = false; setStatus('invalid', 'Could not load the SQL formatting engine — check your connection.'); }
    // A 200 is not enough: the global is still missing if something captured the UMD wrapper.
    s.onload = function () { restoreDefs(); if (!window.sqlFormatter) { libFailed(); return; } var f = libCb; libCb = null; if (f) f(); };
    s.onerror = function () { restoreDefs(); libFailed(); };
    document.head.appendChild(s);
  }

  function doFormat() {
    var src = input.value.trim();
    if (!src) { showOutput('Formatted SQL will appear here...'); rawOutput = ''; status.innerHTML = ''; return; }
    try {
      var io = indentOpts();
      var formatted = sqlFormatter.format(src, {
        language: dialectSelect.value,
        tabWidth: io.tabWidth,
        useTabs: io.useTabs,
        keywordCase: caseSelect.value
      });
      showOutput(formatted);
      statusFor(formatted);
    } catch (e) {
      setStatus('invalid', 'Could not format: ' + escapeHtml(e.message));
    }
  }

  function formatSQL() {
    if (!input.value.trim()) { showOutput('Formatted SQL will appear here...'); rawOutput = ''; status.innerHTML = ''; return; }
    setStatus('', 'Formatting…');
    ensureLib(doFormat);
  }

  // Whitespace minify that leaves string literals and identifiers intact.
  function minifySQL(s) {
    var out = '', i = 0, n = s.length, q = null;
    while (i < n) {
      var c = s.charAt(i);
      if (q) {
        if (c === q && s.charAt(i + 1) === q) { out += c + c; i += 2; continue; } // escaped '' or ""
        out += c;
        if (c === q) q = null;
        i++;
        continue;
      }
      if (c === "'" || c === '"' || c === '`') { q = c; out += c; i++; continue; }
      if (c === '-' && s.charAt(i + 1) === '-') { while (i < n && s.charAt(i) !== '\n') i++; continue; }
      if (c === '/' && s.charAt(i + 1) === '*') { i += 2; while (i < n && !(s.charAt(i) === '*' && s.charAt(i + 1) === '/')) i++; i += 2; continue; }
      if (/\s/.test(c)) {
        while (i < n && /\s/.test(s.charAt(i))) i++;
        if (out && !/\s$/.test(out)) out += ' ';
        continue;
      }
      out += c; i++;
    }
    return out.trim();
  }

  function minify() {
    var src = input.value.trim();
    if (!src) return;
    var min = minifySQL(src);
    showOutput(min);
    setStatus('valid', 'Minified — ' + min.length + ' chars (saved ' + (input.value.length - min.length) + ')');
  }

  function clearAll() {
    input.value = '';
    rawOutput = '';
    output.textContent = 'Formatted SQL will appear here...';
    status.innerHTML = '';
    if (location.hash) history.replaceState(null, '', location.pathname);
  }

  // URL sharing — state lives in the hash fragment, never sent to a server.
  function b64e(str) { return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function b64d(b) { b = b.replace(/-/g, '+').replace(/_/g, '/'); return decodeURIComponent(escape(atob(b))); }

  function share() {
    if (!input.value.trim()) { showToast('Nothing to share yet'); return; }
    var state = { q: input.value, l: dialectSelect.value, i: indentSelect.value, c: caseSelect.value };
    var enc = b64e(JSON.stringify(state));
    if (enc.length > 16000) { showToast('Query too large to share via URL'); return; }
    var url = location.origin + location.pathname + '#s=' + enc;
    history.replaceState(null, '', url);
    copyToClipboard(url, document.getElementById('btn-share'));
  }

  function restore() {
    var m = location.hash.match(/#s=(.+)$/);
    if (!m) return false;
    try {
      var state = JSON.parse(b64d(m[1]));
      input.value = state.q || '';
      if (state.l) dialectSelect.value = state.l;
      if (state.i) indentSelect.value = state.i;
      if (state.c) caseSelect.value = state.c;
      return true;
    } catch (e) { return false; }
  }

  document.getElementById('btn-format').addEventListener('click', formatSQL);
  document.getElementById('btn-minify').addEventListener('click', minify);
  document.getElementById('btn-clear').addEventListener('click', clearAll);
  document.getElementById('btn-copy').addEventListener('click', function() { if (rawOutput) copyToClipboard(rawOutput, this); });
  document.getElementById('btn-download').addEventListener('click', function() { if (rawOutput) downloadText(rawOutput, 'formatted.sql'); });
  document.getElementById('btn-share').addEventListener('click', share);
  [dialectSelect, indentSelect, caseSelect].forEach(function(el) { el.addEventListener('change', formatSQL); });

  document.getElementById('btn-upload').addEventListener('click', function() { document.getElementById('file-upload').click(); });
  document.getElementById('file-upload').addEventListener('change', function(e) {
    var f = e.target.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function(ev) { input.value = ev.target.result; formatSQL(); };
    r.readAsText(f); e.target.value = '';
  });
  input.addEventListener('paste', function() { setTimeout(formatSQL, 50); });

  // Default load: show the sample already formatted (constant) without pulling
  // the engine; a restored share link formats live.
  if (restore()) {
    formatSQL();
  } else {
    input.value = SAMPLE;
    showOutput(SAMPLE_FORMATTED);
    statusFor(SAMPLE_FORMATTED);
  }
})();
