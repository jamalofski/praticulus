(function() {
  'use strict';
  var input = document.getElementById('input');
  var output = document.getElementById('output');
  var status = document.getElementById('status');
  var indentSelect = document.getElementById('indent-select');
  var rawOutput = '';

  // js-yaml (~13kB gzip) is lazy-loaded on first use so the initial page load
  // stays within the perf budget. Vendored locally — no third-party CDN (CSP).
  var libInjected = false, libCb = null;
  function ensureLib(cb) {
    if (window.jsyaml) { cb(); return; }
    libCb = cb;
    if (libInjected) return;
    libInjected = true;
    var s = document.createElement('script');
    s.src = '/js/vendor/js-yaml.min.js?v=20260913a';
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
    function libFailed() { libInjected = false; setStatus('invalid', 'Could not load the YAML engine, check your connection.'); }
    // A 200 is not enough: the global is still missing if something captured the UMD wrapper.
    s.onload = function () { restoreDefs(); if (!window.jsyaml) { libFailed(); return; } var f = libCb; libCb = null; if (f) f(); };
    s.onerror = function () { restoreDefs(); libFailed(); };
    document.head.appendChild(s);
  }

  function getIndent() { return parseInt(indentSelect.value, 10) || 2; }

  function findInlineComment(line) {
    // Index of an unquoted '#' that starts a comment, or -1. A comment '#'
    // must be at line start or preceded by whitespace (YAML rule).
    var inS = false, inD = false;
    for (var k = 0; k < line.length; k++) {
      var ch = line[k];
      if (ch === "'" && !inD) inS = !inS;
      else if (ch === '"' && !inS) inD = !inD;
      else if (ch === '#' && !inS && !inD && (k === 0 || /\s/.test(line[k - 1]))) return k;
    }
    return -1;
  }

  function highlightYAML(line) {
    var comment = '';
    var ci = findInlineComment(line);
    if (ci >= 0) { comment = line.slice(ci); line = line.slice(0, ci); }
    var h = escapeHtml(line);
    // key: (optionally prefixed by indentation and one or more "- " list markers)
    h = h.replace(/^(\s*(?:- )*)([^:#\n]+?)(:)(\s|$)/, function (_, pre, key, colon, tail) {
      return pre + '<span class="json-key">' + key + '</span>' + colon + tail;
    });
    // quoted scalar strings
    h = h.replace(/(&quot;[^&]*?&quot;|&#39;[^&]*?&#39;)/g, '<span class="json-str">$1</span>');
    // numeric scalar value
    h = h.replace(/((?::\s+|^\s*- ))(-?\d+\.?\d*(?:[eE][+-]?\d+)?)(\s*)$/, '$1<span class="json-num">$2</span>$3');
    // boolean / null scalar value
    h = h.replace(/((?::\s+|^\s*- ))(true|false|null|~)(\s*)$/i, '$1<span class="json-bool">$2</span>$3');
    return comment ? h + escapeHtml(comment) : h;
  }

  function renderWithLines(str) {
    return str.split('\n').map(function (line, i) {
      return '<div class="json-line"><span class="line-num">' + (i + 1) + '</span><span class="line-content">' + highlightYAML(line) + '</span></div>';
    }).join('');
  }

  function fmtError(e) {
    if (e && e.mark && typeof e.mark.line === 'number') {
      return 'Error at line ' + (e.mark.line + 1) + ', column ' + (e.mark.column + 1) + ': ' + escapeHtml(e.reason || e.message);
    }
    return 'Error: ' + escapeHtml((e && e.message) || String(e));
  }

  function parseInput() {
    // Throws YAMLException on invalid / multi-document input.
    return window.jsyaml.load(input.value, { schema: window.jsyaml.YAML11_SCHEMA });
  }

  function describe(doc) {
    if (doc === null || doc === undefined) return 'empty document';
    if (Array.isArray(doc)) return 'sequence with ' + doc.length + ' item' + (doc.length === 1 ? '' : 's');
    if (typeof doc === 'object') { var n = Object.keys(doc).length; return 'mapping with ' + n + ' key' + (n === 1 ? '' : 's'); }
    return typeof doc;
  }

  function formatYAML() {
    if (!input.value.trim()) { clearOutput(); return; }
    ensureLib(function () {
      try {
        var doc = parseInput();
        var out = window.jsyaml.dump(doc, { schema: window.jsyaml.YAML11_SCHEMA, indent: getIndent(), lineWidth: -1, noRefs: true }).replace(/\n$/, '');
        rawOutput = out;
        output.innerHTML = renderWithLines(out);
        setStatus('valid', 'Valid YAML — ' + describe(doc) + ', ' + out.length + ' chars');
      } catch (e) { setStatus('invalid', fmtError(e)); }
    });
  }

  function minifyYAML() {
    if (!input.value.trim()) { clearOutput(); return; }
    ensureLib(function () {
      try {
        var doc = parseInput();
        var out = window.jsyaml.dump(doc, { schema: window.jsyaml.YAML11_SCHEMA, flowLevel: 0, indent: getIndent(), lineWidth: -1, noRefs: true }).replace(/\n$/, '');
        rawOutput = out;
        output.innerHTML = renderWithLines(out);
        setStatus('valid', 'Minified to flow style — ' + out.length + ' chars');
      } catch (e) { setStatus('invalid', fmtError(e)); }
    });
  }

  function validateYAML() {
    if (!input.value.trim()) { setStatus('', 'Nothing to validate yet.'); return; }
    ensureLib(function () {
      try {
        var doc = parseInput();
        setStatus('valid', '✓ Valid YAML — ' + describe(doc));
      } catch (e) { setStatus('invalid', fmtError(e)); }
    });
  }

  function clearOutput() { rawOutput = ''; output.textContent = 'Formatted YAML will appear here...'; status.innerHTML = ''; }
  function clearAll() { input.value = ''; clearOutput(); }
  function copyOutput() { copyToClipboard(rawOutput || output.textContent, document.getElementById('btn-copy')); }
  function downloadOutput() { downloadText(rawOutput || output.textContent, 'formatted.yaml'); }
  function setStatus(type, msg) { status.innerHTML = '<span class="' + type + '">' + msg + '</span>'; }

  document.getElementById('btn-format').addEventListener('click', formatYAML);
  document.getElementById('btn-minify').addEventListener('click', minifyYAML);
  document.getElementById('btn-validate').addEventListener('click', validateYAML);
  document.getElementById('btn-clear').addEventListener('click', clearAll);
  document.getElementById('btn-copy').addEventListener('click', copyOutput);
  document.getElementById('btn-download').addEventListener('click', downloadOutput);

  document.getElementById('btn-upload').addEventListener('click', function () { document.getElementById('file-upload').click(); });
  document.getElementById('file-upload').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function (ev) { input.value = ev.target.result; formatYAML(); };
    r.readAsText(f); e.target.value = '';
  });

  input.addEventListener('paste', function () { setTimeout(formatYAML, 50); });
})();
