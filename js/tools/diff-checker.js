(function() {
  'use strict';
  var MAX_CELLS = 4000000; // ~2000 x 2000 lines
  var left = document.getElementById('left-input');
  var right = document.getElementById('right-input');
  var output = document.getElementById('output');
  var stats = document.getElementById('stats');
  var ignoreWs = document.getElementById('ignore-ws');
  var mode = 'split';
  var timer = null;

  var SAMPLE_L = "function greet(name) {\n  const msg = 'Hello, ' + name;\n  console.log(msg);\n  return msg;\n}";
  var SAMPLE_R = "function greet(name, greeting) {\n  const msg = greeting + ', ' + name + '!';\n  console.log(msg);\n  return msg;\n}";

  function esc(s) { return escapeHtml(s); }
  function splitLines(s) { return s.length ? s.split(/\r\n|\r|\n/) : []; }
  function norm(line) { return ignoreWs.checked ? line.replace(/\s+/g, ' ').trim() : line; }

  // Generic LCS diff over two arrays. eq(x,y) compares elements.
  function lcsDiff(a, b, eq) {
    var n = a.length, m = b.length;
    var dp = []; var i, j;
    for (i = 0; i <= n; i++) dp.push(new Uint32Array(m + 1));
    for (i = n - 1; i >= 0; i--) {
      for (j = m - 1; j >= 0; j--) {
        dp[i][j] = eq(a[i], b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    var ops = []; i = 0; j = 0;
    while (i < n && j < m) {
      if (eq(a[i], b[j])) { ops.push({ t: 'eq', a: a[i], b: b[j] }); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ t: 'del', a: a[i] }); i++; }
      else { ops.push({ t: 'ins', b: b[j] }); j++; }
    }
    while (i < n) { ops.push({ t: 'del', a: a[i] }); i++; }
    while (j < m) { ops.push({ t: 'ins', b: b[j] }); j++; }
    return ops;
  }

  // Word-level diff for a changed line pair (keeps whitespace tokens).
  function wordDiff(a, b) {
    var at = a.split(/(\s+)/), bt = b.split(/(\s+)/);
    var ops = lcsDiff(at, bt, function (x, y) { return x === y; });
    var l = '', r = '';
    ops.forEach(function (o) {
      if (o.t === 'eq') { l += esc(o.a); r += esc(o.b); }
      else if (o.t === 'del') { l += '<span class="diff-chunk-del">' + esc(o.a) + '</span>'; }
      else { r += '<span class="diff-chunk-add">' + esc(o.b) + '</span>'; }
    });
    return { left: l, right: r };
  }

  function buildRows(ops) {
    var rows = [], i = 0, ln = 0, rn = 0;
    while (i < ops.length) {
      if (ops[i].t === 'eq') {
        ln++; rn++;
        rows.push({ type: 'eq', lNum: ln, rNum: rn, lHtml: esc(ops[i].a), rHtml: esc(ops[i].b) });
        i++; continue;
      }
      var dels = [], inss = [];
      while (i < ops.length && ops[i].t !== 'eq') {
        if (ops[i].t === 'del') dels.push(ops[i].a); else inss.push(ops[i].b);
        i++;
      }
      var pair = Math.min(dels.length, inss.length), k;
      for (k = 0; k < pair; k++) {
        ln++; rn++;
        var wd = wordDiff(dels[k], inss[k]);
        rows.push({ type: 'chg', lNum: ln, rNum: rn, lHtml: wd.left, rHtml: wd.right });
      }
      for (k = pair; k < dels.length; k++) { ln++; rows.push({ type: 'del', lNum: ln, rNum: null, lHtml: esc(dels[k]), rHtml: '' }); }
      for (k = pair; k < inss.length; k++) { rn++; rows.push({ type: 'ins', lNum: null, rNum: rn, lHtml: '', rHtml: esc(inss[k]) }); }
    }
    return rows;
  }

  function gutter(n) { return '<span class="diff-gutter">' + (n == null ? '' : n) + '</span>'; }

  function renderSplit(rows) {
    var stateCls = { eq: ['diff-ctx', 'diff-ctx'], chg: ['diff-del', 'diff-add'], del: ['diff-del', 'diff-blank'], ins: ['diff-blank', 'diff-add'] };
    var html = '<div class="diff-side">';
    rows.forEach(function (row) {
      var cls = stateCls[row.type];
      html += '<div class="diff-row">' +
        '<div class="diff-cell ' + cls[0] + '">' + gutter(row.lNum) + '<span class="diff-code">' + row.lHtml + '</span></div>' +
        '<div class="diff-cell ' + cls[1] + '">' + gutter(row.rNum) + '<span class="diff-code">' + row.rHtml + '</span></div>' +
        '</div>';
    });
    return html + '</div>';
  }

  function renderInline(rows) {
    var html = '<div class="diff-side diff-unified">';
    function line(cls, l, r, sign, code) {
      return '<div class="diff-line ' + cls + '">' + gutter(l) + gutter(r) + '<span class="diff-sign">' + sign + '</span><span class="diff-code">' + code + '</span></div>';
    }
    rows.forEach(function (row) {
      if (row.type === 'eq') html += line('diff-ctx', row.lNum, row.rNum, ' ', row.lHtml);
      else if (row.type === 'del') html += line('diff-del', row.lNum, null, '-', row.lHtml);
      else if (row.type === 'ins') html += line('diff-add', null, row.rNum, '+', row.rHtml);
      else { html += line('diff-del', row.lNum, null, '-', row.lHtml); html += line('diff-add', null, row.rNum, '+', row.rHtml); }
    });
    return html + '</div>';
  }

  function run() {
    var a = splitLines(left.value), b = splitLines(right.value);
    if (!left.value && !right.value) { output.innerHTML = '<p class="diff-empty-msg">Paste text in both panes to see the difference.</p>'; stats.innerHTML = ''; return; }
    if (a.length * b.length > MAX_CELLS) {
      output.innerHTML = '';
      stats.innerHTML = '<span class="invalid">Inputs too large for a line-by-line diff (max ~2000 lines per side).</span>';
      return;
    }
    var ops = lcsDiff(a, b, function (x, y) { return norm(x) === norm(y); });
    var rows = buildRows(ops);
    var add = 0, del = 0;
    ops.forEach(function (o) { if (o.t === 'ins') add++; else if (o.t === 'del') del++; });
    output.innerHTML = mode === 'split' ? renderSplit(rows) : renderInline(rows);
    if (!add && !del) stats.innerHTML = '<span class="valid">✓ The two inputs are identical' + (ignoreWs.checked ? ' (ignoring whitespace)' : '') + '.</span>';
    else stats.innerHTML = '<span class="diff-stat-add">+' + add + ' added</span> <span class="diff-stat-del">−' + del + ' removed</span>';
  }

  function schedule() { clearTimeout(timer); timer = setTimeout(run, 200); }

  // URL sharing — state lives in the hash fragment, never sent to a server.
  function b64e(str) { return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function b64d(b) { b = b.replace(/-/g, '+').replace(/_/g, '/'); return decodeURIComponent(escape(atob(b))); }

  function share() {
    if (!left.value && !right.value) { showToast('Nothing to share yet'); return; }
    var enc = b64e(JSON.stringify({ a: left.value, b: right.value, w: ignoreWs.checked ? 1 : 0, m: mode }));
    if (enc.length > 16000) { showToast('Inputs too large to share via URL'); return; }
    var url = location.origin + location.pathname + '#d=' + enc;
    history.replaceState(null, '', url);
    copyToClipboard(url, document.getElementById('btn-share'));
  }

  function restore() {
    var m = location.hash.match(/#d=(.+)$/);
    if (!m) return false;
    try {
      var s = JSON.parse(b64d(m[1]));
      left.value = s.a || ''; right.value = s.b || '';
      ignoreWs.checked = !!s.w;
      if (s.m) setMode(s.m);
      return true;
    } catch (e) { return false; }
  }

  function setMode(m) {
    mode = m;
    document.getElementById('view-split').className = 'btn btn-sm ' + (m === 'split' ? 'btn-primary' : 'btn-secondary');
    document.getElementById('view-inline').className = 'btn btn-sm ' + (m === 'inline' ? 'btn-primary' : 'btn-secondary');
  }

  left.addEventListener('input', schedule);
  right.addEventListener('input', schedule);
  ignoreWs.addEventListener('change', run);
  document.getElementById('view-split').addEventListener('click', function () { setMode('split'); run(); });
  document.getElementById('view-inline').addEventListener('click', function () { setMode('inline'); run(); });
  document.getElementById('btn-share').addEventListener('click', share);
  document.getElementById('btn-clear').addEventListener('click', function () {
    left.value = ''; right.value = '';
    if (location.hash) history.replaceState(null, '', location.pathname);
    run();
  });

  if (!restore()) { left.value = SAMPLE_L; right.value = SAMPLE_R; }
  run();
})();
