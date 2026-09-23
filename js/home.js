(function () {
  'use strict';
  var TOOLS = [
    { s: 'qr-generator', n: 'QR Code Generator', i: 'qr', d: 'Make QR codes for URLs, Wi-Fi, and vCards. Export PNG or SVG, nothing uploaded.' },
    { s: 'image-compressor', n: 'Image Compressor', i: 'image', d: 'Compress JPEG, PNG and WebP with a quality slider. Batch, before/after, zero upload.' },
    { s: 'cron-parser', n: 'Cron Expression Parser', i: 'timer', d: 'Explain any cron expression in plain English and preview the next 5 run times.' },
    { s: 'lorem-ipsum', n: 'Lorem Ipsum Generator', i: 'paragraph', d: 'Generate placeholder text in paragraphs, sentences, or words.' },
    { s: 'timestamp-converter', n: 'Unix Timestamp Converter', i: 'clock', d: 'Convert Unix epoch to date and back. Seconds or milliseconds, ISO 8601, UTC and any timezone.' },
    { s: 'markdown-to-html', n: 'Markdown to HTML Converter', i: 'markdown', d: 'Convert Markdown (GFM) to clean HTML, with optional Tailwind classes and live preview.' },
    { s: 'csv-viewer', n: 'CSV Viewer & Formatter', i: 'table', d: 'View CSV as a sortable table, auto-detect the delimiter, export to JSON or TSV.' },
    { s: 'json-formatter', n: 'JSON Formatter & Validator', i: 'braces', d: 'Format, validate, and minify JSON with syntax highlighting and a tree view.' },
    { s: 'color-picker', n: 'Color Picker', i: 'eyedropper', d: 'Pick any color visually or enter HEX, RGB, HSL. Copy color codes instantly.' },
    { s: 'word-counter', n: 'Word Counter', i: 'hash', d: 'Count words, characters, sentences, paragraphs and reading time as you type.' },
    { s: 'password-generator', n: 'Password Generator', i: 'lock', d: 'Generate strong, random passwords with customizable length and character sets.' },
    { s: 'markdown-preview', n: 'Markdown Preview', i: 'markdown', d: 'Write and preview Markdown in real time. Side-by-side editor with live rendering.' },
    { s: 'diff-checker', n: 'Diff Checker', i: 'diff', d: 'Compare two texts side by side or inline, with word-level highlighting.' },
    { s: 'color-converter', n: 'Color Converter', i: 'swatch', d: 'Convert colors between HEX, RGB, HSL, and CMYK with live preview.' },
    { s: 'xml-formatter', n: 'XML Formatter', i: 'code', d: 'Format, minify and validate XML in your browser. Mixed content safe.' },
    { s: 'color-blender', n: 'Color Blender', i: 'blend', d: 'Blend two colors with adjustable midpoints. Create smooth tonal transitions.' },
    { s: 'sql-formatter', n: 'SQL Formatter', i: 'database', d: 'Beautify or minify SQL with dialect and indentation options.' },
    { s: 'text-case', n: 'Text Case Converter', i: 'type', d: 'Convert text between camelCase, snake_case, kebab-case, UPPER, Title Case and more.' },
    { s: 'hash-generator', n: 'Hash Generator', i: 'hash', d: 'Generate MD5, SHA-1, SHA-256, SHA-384, and SHA-512 hashes from any text.' },
    { s: 'palette-generator', n: 'Palette Generator', i: 'palette', d: 'Generate harmonious palettes: complementary, triadic, analogous, and more.' },
    { s: 'uuid-generator', n: 'UUID Generator', i: 'fingerprint', d: 'Generate UUID v4 instantly. Bulk generate and copy with one click.' },
    { s: 'regex-tester', n: 'Regex Tester', i: 'regex', d: 'Test regular expressions with real-time matching, highlighting, and match details.' },
    { s: 'gradient-generator', n: 'CSS Gradient Generator', i: 'gradient', d: 'Build linear, radial, or conic CSS gradients visually. Copy the CSS in one click.' },
    { s: 'url-encoder', n: 'URL Encoder / Decoder', i: 'link', d: 'Encode or decode URLs and query strings. Handles Unicode and percent-encoding.' },
    { s: 'contrast-checker', n: 'Contrast Checker', i: 'contrast', d: 'Check WCAG 2.1 AA/AAA contrast ratios for accessible color combinations.' },
    { s: 'base64', n: 'Base64 Encoder / Decoder', i: 'binary', d: 'Encode or decode Base64 strings instantly. Supports text and file input.' },
    { s: 'hmac-generator', n: 'HMAC Generator', i: 'signature', d: 'Generate HMAC signatures (SHA-256/512) for webhook verification and API auth.' },
    { s: 'jwt-decoder', n: 'JWT Decoder', i: 'token', d: 'Decode and inspect JWT headers, payloads, and claims. Verify expiry locally.' },
    { s: 'cert-decoder', n: 'Certificate Decoder', i: 'certificate', d: 'Decode X.509 / PEM certificates: inspect issuer, validity, and SAN entries.' },
    { s: 'totp-generator', n: 'TOTP Generator', i: 'timer', d: 'Generate time-based one-time passwords from a secret. RFC 6238 compatible.' },
    { s: 'yaml-formatter', n: 'YAML Formatter & Validator', i: 'yaml', d: 'Format, validate, and minify YAML 1.1 and 1.2. Error line and column on invalid input.' }
  ];
  var input = document.getElementById('q');
  var browse = document.getElementById('browse');
  var results = document.getElementById('results');
  var grid = document.getElementById('results-grid');
  var meta = document.getElementById('results-meta');
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function card(t) {
    return '<a href="/' + t.s + '/" class="tool-card"><div class="icon"><svg class="ic" aria-hidden="true"><use href="/icons.svg?v=20260824a#i-' + t.i + '"></use></svg></div><h3>' + esc(t.n) + '</h3><p>' + esc(t.d) + '</p></a>';
  }
  function render() {
    var q = input.value.trim();
    var s = q.toLowerCase();
    if (!s) { results.hidden = true; browse.hidden = false; grid.innerHTML = ''; return; }
    var m = TOOLS.filter(function (t) {
      return t.n.toLowerCase().indexOf(s) >= 0 || t.d.toLowerCase().indexOf(s) >= 0 || t.s.indexOf(s) >= 0;
    });
    browse.hidden = true; results.hidden = false;
    meta.textContent = m.length + ' result' + (m.length === 1 ? '' : 's') + ' for “' + q + '”';
    grid.innerHTML = m.length ? m.map(card).join('') : '';
  }
  input.addEventListener('input', render);
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && !/input|textarea|select/i.test((document.activeElement || {}).tagName || '')) {
      e.preventDefault(); input.focus();
    }
  });
})();
