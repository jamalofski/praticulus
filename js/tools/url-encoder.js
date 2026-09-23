(function() {
  'use strict';
  var input = document.getElementById('input');
  var output = document.getElementById('output');
  var status = document.getElementById('status');
  var urlPartsCard = document.getElementById('url-parts-card');
  var urlParts = document.getElementById('url-parts');
  var lastMode = 'encode';

  function isEncoded(str) {
    return /%[0-9A-Fa-f]{2}/.test(str);
  }

  function liveProcess() {
    var val = input.value;
    if (!val.trim()) {
      output.textContent = 'Result will appear here...';
      status.innerHTML = '';
      urlPartsCard.classList.add('d-none');
      return;
    }
    if (isEncoded(val)) {
      lastMode = 'decode';
      doDecodeURL();
    } else {
      lastMode = 'encode';
      doEncodeURL();
    }
    parseURL(val);
  }

  function parseURL(str) {
    try {
      var decoded = str;
      try { decoded = decodeURIComponent(str); } catch(e) {}
      var url = new URL(decoded);
      var parts = [
        { label: 'Scheme', value: url.protocol.replace(':', '') },
        { label: 'Host', value: url.hostname },
        { label: 'Port', value: url.port || '(default)' },
        { label: 'Path', value: url.pathname },
        { label: 'Query', value: url.search || '(none)' },
        { label: 'Fragment', value: url.hash || '(none)' }
      ];
      urlParts.innerHTML = parts.map(function(p) {
        return '<div class="url-part-row"><span class="url-part-label">' + p.label + '</span><span class="url-part-value">' + escapeHtml(p.value) + '</span></div>';
      }).join('');
      urlPartsCard.classList.remove('d-none');
    } catch (e) {
      urlPartsCard.classList.add('d-none');
    }
  }

  function doEncodeURL() {
    try {
      var result = encodeURI(input.value);
      output.textContent = result;
      status.innerHTML = '<span class="valid">Encoded (encodeURI) — ' + result.length + ' chars</span>';
    } catch (e) {
      status.innerHTML = '<span class="invalid">Error: ' + escapeHtml(e.message) + '</span>';
    }
  }

  function doDecodeURL() {
    try {
      var result = decodeURIComponent(input.value.trim());
      output.textContent = result;
      status.innerHTML = '<span class="valid">Decoded — ' + result.length + ' chars</span>';
    } catch (e) {
      status.innerHTML = '<span class="invalid">Error: Invalid encoded string</span>';
    }
  }

  function encodeComponent() {
    try {
      var result = encodeURIComponent(input.value);
      output.textContent = result;
      status.innerHTML = '<span class="valid">Encoded (encodeURIComponent) — ' + result.length + ' chars</span>';
    } catch (e) {
      status.innerHTML = '<span class="invalid">Error: ' + escapeHtml(e.message) + '</span>';
    }
  }

  function swapIO() {
    var out = output.textContent;
    if (out && out !== 'Result will appear here...') {
      input.value = out;
      output.textContent = '';
      status.innerHTML = '';
      liveProcess();
    }
  }

  function clearAll() {
    input.value = '';
    output.textContent = 'Result will appear here...';
    status.innerHTML = '';
    urlPartsCard.classList.add('d-none');
  }

  function copyOutput() {
    navigator.clipboard.writeText(output.textContent);
    showToast('Copied!');
  }

  input.addEventListener('input', liveProcess);
  document.getElementById('btn-encode').addEventListener('click', function() { lastMode = 'encode'; doEncodeURL(); });
  document.getElementById('btn-decode').addEventListener('click', function() { lastMode = 'decode'; doDecodeURL(); });
  document.getElementById('btn-encode-component').addEventListener('click', encodeComponent);
  document.getElementById('btn-swap').addEventListener('click', swapIO);
  document.getElementById('btn-clear').addEventListener('click', clearAll);
  document.getElementById('btn-copy').addEventListener('click', copyOutput);
})();
