(function() {
  'use strict';
  var input = document.getElementById('input');
  var results = document.getElementById('results');

  function cap(w) { return w ? w.charAt(0).toUpperCase() + w.slice(1) : w; }

  // Split into lowercase tokens on separators and existing camelCase boundaries.
  function tokens(s) {
    return s
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[^A-Za-z0-9]+/g, ' ')
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
  }

  function alternating(s) {
    var j = 0;
    return s.split('').map(function (c) {
      if (/[a-z]/i.test(c)) { var r = (j % 2) ? c.toUpperCase() : c.toLowerCase(); j++; return r; }
      return c;
    }).join('');
  }

  var CASES = [
    { name: 'UPPERCASE',     fn: function (s) { return s.toUpperCase(); } },
    { name: 'lowercase',     fn: function (s) { return s.toLowerCase(); } },
    { name: 'Title Case',    fn: function (s) { return s.toLowerCase().replace(/\b\w/g, function (c) { return c.toUpperCase(); }); } },
    { name: 'Sentence case', fn: function (s) { return s.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, function (c) { return c.toUpperCase(); }); } },
    { name: 'camelCase',     fn: function (s) { return tokens(s).map(function (w, i) { return i ? cap(w) : w; }).join(''); } },
    { name: 'PascalCase',    fn: function (s) { return tokens(s).map(cap).join(''); } },
    { name: 'snake_case',    fn: function (s) { return tokens(s).join('_'); } },
    { name: 'kebab-case',    fn: function (s) { return tokens(s).join('-'); } },
    { name: 'CONSTANT_CASE', fn: function (s) { return tokens(s).join('_').toUpperCase(); } },
    { name: 'aLtErNaTiNg',   fn: alternating }
  ];

  function render() {
    var v = input.value;
    results.innerHTML = CASES.map(function (c) {
      var out = c.fn(v);
      return '<div class="kv-row"><span class="kv-label">' + c.name + '</span>' +
             '<span class="kv-value"><span class="ttext">' + escapeHtml(out) + '</span>' +
             '<button class="kv-copy" type="button" aria-label="Copy ' + c.name + '">Copy</button></span></div>';
    }).join('');
  }

  results.addEventListener('click', function (e) {
    var btn = e.target.closest('.kv-copy');
    if (!btn) return;
    var val = btn.parentNode.querySelector('.ttext').textContent;
    if (val) copyToClipboard(val, btn);
  });

  input.addEventListener('input', render);
  render();
})();
