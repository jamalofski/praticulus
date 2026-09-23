(function() {
  'use strict';
  function md5(string) {
    function md5cycle(x, k) {
      var a = x[0], b = x[1], c = x[2], d = x[3];
      a = ff(a, b, c, d, k[0], 7, -680876936); d = ff(d, a, b, c, k[1], 12, -389564586);
      c = ff(c, d, a, b, k[2], 17, 606105819); b = ff(b, c, d, a, k[3], 22, -1044525330);
      a = ff(a, b, c, d, k[4], 7, -176418897); d = ff(d, a, b, c, k[5], 12, 1200080426);
      c = ff(c, d, a, b, k[6], 17, -1473231341); b = ff(b, c, d, a, k[7], 22, -45705983);
      a = ff(a, b, c, d, k[8], 7, 1770035416); d = ff(d, a, b, c, k[9], 12, -1958414417);
      c = ff(c, d, a, b, k[10], 17, -42063); b = ff(b, c, d, a, k[11], 22, -1990404162);
      a = ff(a, b, c, d, k[12], 7, 1804603682); d = ff(d, a, b, c, k[13], 12, -40341101);
      c = ff(c, d, a, b, k[14], 17, -1502002290); b = ff(b, c, d, a, k[15], 22, 1236535329);
      a = gg(a, b, c, d, k[1], 5, -165796510); d = gg(d, a, b, c, k[6], 9, -1069501632);
      c = gg(c, d, a, b, k[11], 14, 643717713); b = gg(b, c, d, a, k[0], 20, -373897302);
      a = gg(a, b, c, d, k[5], 5, -701558691); d = gg(d, a, b, c, k[10], 9, 38016083);
      c = gg(c, d, a, b, k[15], 14, -660478335); b = gg(b, c, d, a, k[4], 20, -405537848);
      a = gg(a, b, c, d, k[9], 5, 568446438); d = gg(d, a, b, c, k[14], 9, -1019803690);
      c = gg(c, d, a, b, k[3], 14, -187363961); b = gg(b, c, d, a, k[8], 20, 1163531501);
      a = gg(a, b, c, d, k[13], 5, -1444681467); d = gg(d, a, b, c, k[2], 9, -51403784);
      c = gg(c, d, a, b, k[7], 14, 1735328473); b = gg(b, c, d, a, k[12], 20, -1926607734);
      a = hh(a, b, c, d, k[5], 4, -378558); d = hh(d, a, b, c, k[8], 11, -2022574463);
      c = hh(c, d, a, b, k[11], 16, 1839030562); b = hh(b, c, d, a, k[14], 23, -35309556);
      a = hh(a, b, c, d, k[1], 4, -1530992060); d = hh(d, a, b, c, k[4], 11, 1272893353);
      c = hh(c, d, a, b, k[7], 16, -155497632); b = hh(b, c, d, a, k[10], 23, -1094730640);
      a = hh(a, b, c, d, k[13], 4, 681279174); d = hh(d, a, b, c, k[0], 11, -358537222);
      c = hh(c, d, a, b, k[3], 16, -722521979); b = hh(b, c, d, a, k[6], 23, 76029189);
      a = hh(a, b, c, d, k[9], 4, -640364487); d = hh(d, a, b, c, k[12], 11, -421815835);
      c = hh(c, d, a, b, k[15], 16, 530742520); b = hh(b, c, d, a, k[2], 23, -995338651);
      a = ii(a, b, c, d, k[0], 6, -198630844); d = ii(d, a, b, c, k[7], 10, 1126891415);
      c = ii(c, d, a, b, k[14], 15, -1416354905); b = ii(b, c, d, a, k[5], 21, -57434055);
      a = ii(a, b, c, d, k[12], 6, 1700485571); d = ii(d, a, b, c, k[3], 10, -1894986606);
      c = ii(c, d, a, b, k[10], 15, -1051523); b = ii(b, c, d, a, k[1], 21, -2054922799);
      a = ii(a, b, c, d, k[8], 6, 1873313359); d = ii(d, a, b, c, k[15], 10, -30611744);
      c = ii(c, d, a, b, k[6], 15, -1560198380); b = ii(b, c, d, a, k[13], 21, 1309151649);
      a = ii(a, b, c, d, k[4], 6, -145523070); d = ii(d, a, b, c, k[11], 10, -1120210379);
      c = ii(c, d, a, b, k[2], 15, 718787259); b = ii(b, c, d, a, k[9], 21, -343485551);
      x[0] = add32(a, x[0]); x[1] = add32(b, x[1]); x[2] = add32(c, x[2]); x[3] = add32(d, x[3]);
    }
    function cmn(q, a, b, x, s, t) { a = add32(add32(a, q), add32(x, t)); return add32((a << s) | (a >>> (32 - s)), b); }
    function ff(a, b, c, d, x, s, t) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
    function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
    function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
    function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }
    function md51(s) {
      var n = s.length, state = [1732584193, -271733879, -1732584194, 271733878], i;
      for (i = 64; i <= n; i += 64) md5cycle(state, md5blk(s.substring(i - 64, i)));
      s = s.substring(i - 64);
      var tail = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
      for (i = 0; i < s.length; i++) tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
      tail[i >> 2] |= 0x80 << ((i % 4) << 3);
      if (i > 55) { md5cycle(state, tail); tail = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]; }
      tail[14] = n * 8;
      md5cycle(state, tail);
      return state;
    }
    function md5blk(s) {
      var md5blks = [], i;
      for (i = 0; i < 64; i += 4) md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i+1) << 8) + (s.charCodeAt(i+2) << 16) + (s.charCodeAt(i+3) << 24);
      return md5blks;
    }
    var hex_chr = '0123456789abcdef'.split('');
    function rhex(n) { var s = '', j = 0; for (; j < 4; j++) s += hex_chr[(n >> (j * 8 + 4)) & 0x0F] + hex_chr[(n >> (j * 8)) & 0x0F]; return s; }
    function hex(x) { for (var i = 0; i < x.length; i++) x[i] = rhex(x[i]); return x.join(''); }
    function add32(a, b) { return (a + b) & 0xFFFFFFFF; }
    return hex(md51(string));
  }

  function hexToBytes(hex) {
    var bytes = new Uint8Array(hex.length / 2);
    for (var i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    return bytes;
  }

  function bytesToBase64(bytes) {
    var binary = '';
    for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  function hexToBase64(hex) { return bytesToBase64(hexToBytes(hex)); }

  function bufferToBase64(buf) { return bytesToBase64(new Uint8Array(buf)); }

  function bufferToHex(buf) {
    return Array.from(new Uint8Array(buf), function(b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  function encode(hexOrBuf) {
    // accepts hex string OR ArrayBuffer
    if (typeof hexOrBuf === 'string') {
      return state.base64 ? hexToBase64(hexOrBuf) : hexOrBuf;
    }
    return state.base64 ? bufferToBase64(hexOrBuf) : bufferToHex(hexOrBuf);
  }

  function digestText(algo, text) {
    var data = new TextEncoder().encode(text);
    return crypto.subtle.digest(algo, data);
  }

  function digestBuffer(algo, buffer) {
    return crypto.subtle.digest(algo, buffer);
  }

  function md5FromBuffer(buffer) {
    var bytes = new Uint8Array(buffer);
    var str = '';
    for (var i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
    return md5(str);
  }

  var state = { base64: false, lastBuffer: null, lastText: '', raw: { md5: '', sha1: '', sha256: '', sha384: '', sha512: '' } };

  var els = {
    input: document.getElementById('input'),
    base64Toggle: document.getElementById('base64-output'),
    results: document.getElementById('results'),
    fileStatus: document.getElementById('file-status'),
    compareInput: document.getElementById('compare-hash'),
    compareResult: document.getElementById('compare-result'),
    md5: document.getElementById('md5'),
    sha1: document.getElementById('sha1'),
    sha256: document.getElementById('sha256'),
    sha384: document.getElementById('sha384'),
    sha512: document.getElementById('sha512')
  };

  function readFragment() {
    var hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    var params = new URLSearchParams(hash);
    if (params.get('enc') === 'base64') {
      state.base64 = true;
      els.base64Toggle.checked = true;
    }
  }

  function writeFragment() {
    if (state.base64) {
      history.replaceState(null, '', '#enc=base64');
    } else {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }

  function renderOutputs() {
    els.md5.textContent = state.raw.md5 ? encode(state.raw.md5) : '';
    els.sha1.textContent = state.raw.sha1 ? encode(state.raw.sha1) : '';
    els.sha256.textContent = state.raw.sha256 ? encode(state.raw.sha256) : '';
    els.sha384.textContent = state.raw.sha384 ? encode(state.raw.sha384) : '';
    els.sha512.textContent = state.raw.sha512 ? encode(state.raw.sha512) : '';
    checkCompare();
  }

  function generateFromText(text) {
    els.results.classList.remove('d-none');
    state.raw.md5 = md5(text);
    Promise.all([
      digestText('SHA-1', text),
      digestText('SHA-256', text),
      digestText('SHA-384', text),
      digestText('SHA-512', text)
    ]).then(function(bufs) {
      state.raw.sha1 = bufferToHex(bufs[0]);
      state.raw.sha256 = bufferToHex(bufs[1]);
      state.raw.sha384 = bufferToHex(bufs[2]);
      state.raw.sha512 = bufferToHex(bufs[3]);
      renderOutputs();
    });
    renderOutputs();
  }

  function generateFromBuffer(buffer) {
    els.results.classList.remove('d-none');
    state.raw.md5 = md5FromBuffer(buffer);
    Promise.all([
      digestBuffer('SHA-1', buffer),
      digestBuffer('SHA-256', buffer),
      digestBuffer('SHA-384', buffer),
      digestBuffer('SHA-512', buffer)
    ]).then(function(bufs) {
      state.raw.sha1 = bufferToHex(bufs[0]);
      state.raw.sha256 = bufferToHex(bufs[1]);
      state.raw.sha384 = bufferToHex(bufs[2]);
      state.raw.sha512 = bufferToHex(bufs[3]);
      renderOutputs();
    });
    renderOutputs();
  }

  function generateAll() {
    if (state.lastBuffer) {
      generateFromBuffer(state.lastBuffer);
      return;
    }
    var text = els.input.value;
    if (!text) {
      els.results.classList.add('d-none');
      state.raw = { md5: '', sha1: '', sha256: '', sha384: '', sha512: '' };
      return;
    }
    generateFromText(text);
  }

  function hashFile(file) {
    els.fileStatus.innerHTML = '<span class="text-muted">Hashing ' + escapeHtml(file.name) + '...</span>';
    var reader = new FileReader();
    reader.onload = function(e) {
      state.lastBuffer = e.target.result;
      generateFromBuffer(state.lastBuffer);
      els.fileStatus.innerHTML = '<span class="valid">Hashed: ' + escapeHtml(file.name) + ' (' + (file.size / 1024).toFixed(1) + ' KB)</span>';
    };
    reader.readAsArrayBuffer(file);
  }

  function checkCompare() {
    var expected = els.compareInput.value.trim();
    var result = els.compareResult;
    if (!expected) { result.innerHTML = ''; return; }
    var ids = ['md5', 'sha1', 'sha256', 'sha384', 'sha512'];
    var matched = null;
    for (var i = 0; i < ids.length; i++) {
      var val = els[ids[i]].textContent;
      if (val && val.toLowerCase() === expected.toLowerCase()) { matched = ids[i].toUpperCase(); break; }
      // Also match cross-format: if user pasted hex but display is base64, or vice versa
      if (state.raw[ids[i]]) {
        var hex = state.raw[ids[i]];
        var b64 = hexToBase64(hex);
        if (expected.toLowerCase() === hex.toLowerCase() || expected === b64) { matched = ids[i].toUpperCase(); break; }
      }
    }
    if (matched) {
      result.innerHTML = '<span class="valid hash-match">✓ Match (' + matched + ')</span>';
    } else if (state.raw.md5) {
      result.innerHTML = '<span class="invalid hash-mismatch">✗ No match</span>';
    } else {
      result.innerHTML = '<span class="text-muted">Generate hashes first</span>';
    }
  }

  function copyHash(id) {
    var val = els[id].textContent;
    if (!val) return;
    navigator.clipboard.writeText(val);
    showToast('Copied!');
  }

  function clearAll() {
    els.input.value = '';
    state.lastBuffer = null;
    state.raw = { md5: '', sha1: '', sha256: '', sha384: '', sha512: '' };
    els.results.classList.add('d-none');
    els.fileStatus.innerHTML = '';
    els.compareResult.innerHTML = '';
  }

  els.base64Toggle.addEventListener('change', function() {
    state.base64 = els.base64Toggle.checked;
    writeFragment();
    renderOutputs();
  });

  var debounceTimer;
  els.input.addEventListener('input', function() {
    state.lastBuffer = null;
    els.fileStatus.innerHTML = '';
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(generateAll, 150);
  });

  var dropZone = document.getElementById('drop-zone');
  var fileInput = document.getElementById('file-input');
  dropZone.addEventListener('click', function() { fileInput.click(); });
  fileInput.addEventListener('change', function() { if (fileInput.files[0]) hashFile(fileInput.files[0]); });
  dropZone.addEventListener('dragover', function(e) { e.preventDefault(); dropZone.classList.add('drop-zone-active'); });
  dropZone.addEventListener('dragleave', function() { dropZone.classList.remove('drop-zone-active'); });
  dropZone.addEventListener('drop', function(e) {
    e.preventDefault();
    dropZone.classList.remove('drop-zone-active');
    if (e.dataTransfer.files[0]) hashFile(e.dataTransfer.files[0]);
  });

  els.compareInput.addEventListener('input', checkCompare);
  document.getElementById('btn-clear').addEventListener('click', clearAll);
  document.getElementById('btn-copy-md5').addEventListener('click', function() { copyHash('md5'); });
  document.getElementById('btn-copy-sha1').addEventListener('click', function() { copyHash('sha1'); });
  document.getElementById('btn-copy-sha256').addEventListener('click', function() { copyHash('sha256'); });
  document.getElementById('btn-copy-sha384').addEventListener('click', function() { copyHash('sha384'); });
  document.getElementById('btn-copy-sha512').addEventListener('click', function() { copyHash('sha512'); });

  readFragment();
})();
