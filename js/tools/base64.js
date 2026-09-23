(function() {
  'use strict';
  var input = document.getElementById('input');
  var output = document.getElementById('output');
  var status = document.getElementById('status');
  var counter = document.getElementById('counter');
  var urlSafe = document.getElementById('url-safe');
  var autoDetect = document.getElementById('auto-detect');
  var dropZone = document.getElementById('drop-zone');
  var fileInput = document.getElementById('file-input');
  var imagePreview = document.getElementById('image-preview');

  function isBase64(str) {
    str = str.trim();
    if (str.length < 2) return false;
    return /^[A-Za-z0-9+/\-_]+=*$/.test(str) && str.length % 4 <= 2;
  }

  function toUrlSafe(b64) {
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function fromUrlSafe(b64) {
    var s = b64.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return s;
  }

  function updateCounter(inLen, outLen) {
    if (!inLen) { counter.textContent = ''; return; }
    var ratio = outLen > 0 ? (outLen / inLen).toFixed(2) : '—';
    counter.textContent = inLen + ' chars input → ' + outLen + ' chars output (×' + ratio + ')';
  }

  function encode() {
    try {
      var encoded = btoa(unescape(encodeURIComponent(input.value)));
      if (urlSafe.checked) encoded = toUrlSafe(encoded);
      output.textContent = encoded;
      status.innerHTML = '<span class="valid">Encoded — ' + encoded.length + ' chars</span>';
      updateCounter(input.value.length, encoded.length);
      imagePreview.innerHTML = '';
    } catch (e) {
      status.innerHTML = '<span class="invalid">Error: ' + escapeHtml(e.message) + '</span>';
    }
  }

  function decode() {
    try {
      var raw = input.value.trim();
      if (urlSafe.checked || /[-_]/.test(raw)) raw = fromUrlSafe(raw);
      var decoded = decodeURIComponent(escape(atob(raw)));
      output.textContent = decoded;
      status.innerHTML = '<span class="valid">Decoded — ' + decoded.length + ' chars</span>';
      updateCounter(input.value.length, decoded.length);
      imagePreview.innerHTML = '';
    } catch (e) {
      status.innerHTML = '<span class="invalid">Error: Invalid Base64 string</span>';
    }
  }

  function autoProcess() {
    if (!autoDetect.checked) return;
    var val = input.value.trim();
    if (!val) { output.textContent = 'Result will appear here...'; status.innerHTML = ''; counter.textContent = ''; imagePreview.innerHTML = ''; return; }
    if (isBase64(val)) { decode(); } else { encode(); }
  }

  function swap() {
    var out = output.textContent;
    if (out && out !== 'Result will appear here...') {
      input.value = out;
      output.textContent = '';
      status.innerHTML = '';
      counter.textContent = '';
      imagePreview.innerHTML = '';
    }
  }

  function clearAll() {
    input.value = '';
    output.textContent = 'Result will appear here...';
    status.innerHTML = '';
    counter.textContent = '';
    imagePreview.innerHTML = '';
  }

  function copyOutput() {
    navigator.clipboard.writeText(output.textContent);
    showToast('Copied!');
  }

  function handleFile(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var bytes = new Uint8Array(e.target.result);
      var binary = '';
      for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      var encoded = btoa(binary);
      if (urlSafe.checked) encoded = toUrlSafe(encoded);
      var dataUri = 'data:' + file.type + ';base64,' + btoa(binary);
      output.textContent = encoded;
      status.innerHTML = '<span class="valid">File encoded — ' + escapeHtml(file.name) + ' (' + (file.size / 1024).toFixed(1) + ' KB)</span>';
      updateCounter(file.size, encoded.length);
      if (file.type.startsWith('image/')) {
        imagePreview.innerHTML = '<img src="' + dataUri + '" class="file-preview-img" alt="Preview">';
        input.value = dataUri;
      } else {
        imagePreview.innerHTML = '';
        input.value = encoded;
      }
    };
    reader.readAsArrayBuffer(file);
  }

  dropZone.addEventListener('click', function() { fileInput.click(); });
  fileInput.addEventListener('change', function() { if (fileInput.files[0]) handleFile(fileInput.files[0]); });
  dropZone.addEventListener('dragover', function(e) { e.preventDefault(); dropZone.classList.add('drop-zone-active'); });
  dropZone.addEventListener('dragleave', function() { dropZone.classList.remove('drop-zone-active'); });
  dropZone.addEventListener('drop', function(e) {
    e.preventDefault();
    dropZone.classList.remove('drop-zone-active');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });

  input.addEventListener('input', autoProcess);
  document.getElementById('btn-encode').addEventListener('click', encode);
  document.getElementById('btn-decode').addEventListener('click', decode);
  document.getElementById('btn-swap').addEventListener('click', swap);
  document.getElementById('btn-clear').addEventListener('click', clearAll);
  document.getElementById('btn-copy').addEventListener('click', copyOutput);
})();
