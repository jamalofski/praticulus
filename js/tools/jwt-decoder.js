(function () {
  'use strict';

  var SAMPLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkYSBMb3ZlbGFjZSIsImlhdCI6MTcxNjIzOTAyMiwiZXhwIjoyMDc1NTQ1MDIyfQ.7sROj9p7Tz6m6yA5e8oZ8dQ8mC0sR1mGz1H4zlYqkVE';

  var els = {
    input: document.getElementById('jwt-input'),
    colored: document.getElementById('jwt-colored'),
    status: document.getElementById('jwt-status'),
    shareNote: document.getElementById('jwt-share-note'),
    decoded: document.getElementById('jwt-decoded'),
    header: document.getElementById('jwt-header'),
    payload: document.getElementById('jwt-payload'),
    claims: document.getElementById('jwt-claims'),
    signature: document.getElementById('jwt-signature'),
    verifyCard: document.getElementById('jwt-verify-card'),
    algNote: document.getElementById('jwt-alg-note'),
    secretGroup: document.getElementById('jwt-secret-group'),
    secret: document.getElementById('jwt-secret'),
    secretB64: document.getElementById('jwt-secret-b64'),
    pubkeyGroup: document.getElementById('jwt-pubkey-group'),
    pubkey: document.getElementById('jwt-pubkey'),
    verifyResult: document.getElementById('jwt-verify-result')
  };

  var current = null; // { parts, header, payload, alg }

  // --- Base64url helpers ---
  function b64urlToBytes(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  function b64urlToString(s) {
    return new TextDecoder().decode(b64urlToBytes(s));
  }
  function bytesFromString(s) { return new TextEncoder().encode(s); }
  function b64ToBytes(s) {
    var bin = atob(s.replace(/\s+/g, ''));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  // --- JSON syntax highlight (reuses .json-* classes) ---
  function highlightJson(obj) {
    var json = JSON.stringify(obj, null, 2);
    json = escapeHtml(json);
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      function (match) {
        var cls = 'json-num';
        if (/^"/.test(match)) {
          cls = /:$/.test(match) ? 'json-key' : 'json-str';
        } else if (/true|false/.test(match)) {
          cls = 'json-bool';
        } else if (/null/.test(match)) {
          cls = 'json-bool';
        }
        return '<span class="' + cls + '">' + match + '</span>';
      });
  }

  function fmtTime(sec) {
    var d = new Date(sec * 1000);
    if (isNaN(d.getTime())) return 'invalid date';
    return d.toISOString().replace('.000', '') + ' (' + d.toUTCString() + ')';
  }

  function renderColored(parts) {
    var html = '<span class="jwt-seg-h">' + escapeHtml(parts[0]) + '</span>'
      + '<span class="jwt-seg-dot">.</span>'
      + '<span class="jwt-seg-p">' + escapeHtml(parts[1]) + '</span>'
      + '<span class="jwt-seg-dot">.</span>'
      + '<span class="jwt-seg-s">' + escapeHtml(parts[2] || '') + '</span>';
    els.colored.innerHTML = html;
    els.colored.classList.remove('d-none');
  }

  function renderClaims(payload) {
    var rows = [];
    var now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === 'number') {
      var expired = now >= payload.exp;
      rows.push('<div class="jwt-claim-row"><span class="jwt-claim-name">exp</span><span>'
        + fmtTime(payload.exp) + ' — <span class="' + (expired ? 'invalid' : 'valid') + '">'
        + (expired ? '✗ expired' : '✓ not expired') + '</span></span></div>');
    }
    if (typeof payload.nbf === 'number') {
      var notYet = now < payload.nbf;
      rows.push('<div class="jwt-claim-row"><span class="jwt-claim-name">nbf</span><span>'
        + fmtTime(payload.nbf) + (notYet ? ' — <span class="invalid">✗ not valid yet</span>' : ' — <span class="valid">✓ active</span>') + '</span></div>');
    }
    if (typeof payload.iat === 'number') {
      rows.push('<div class="jwt-claim-row"><span class="jwt-claim-name">iat</span><span>' + fmtTime(payload.iat) + '</span></div>');
    }
    if (rows.length) {
      els.claims.innerHTML = rows.join('');
      els.claims.classList.remove('d-none');
    } else {
      els.claims.classList.add('d-none');
    }
  }

  function setAlgUi(alg) {
    els.algNote.textContent = 'Algorithm: ' + alg;
    var isHmac = /^HS/.test(alg);
    var isAsym = /^(RS|ES|PS)/.test(alg);
    els.secretGroup.classList.toggle('d-none', !isHmac);
    els.pubkeyGroup.classList.toggle('d-none', !isAsym);
    if (alg === 'none') {
      els.algNote.textContent = 'Algorithm: none — this token is unsigned.';
    }
  }

  function reset() {
    current = null;
    els.colored.classList.add('d-none');
    els.decoded.classList.add('d-none');
    els.verifyCard.classList.add('d-none');
    els.verifyResult.innerHTML = '';
    els.shareNote.classList.add('d-none');
  }

  function decode() {
    var raw = els.input.value.trim();
    els.verifyResult.innerHTML = '';
    if (!raw) { reset(); els.status.innerHTML = ''; return; }
    var parts = raw.split('.');
    if (parts.length < 2 || parts.length > 3) {
      reset();
      els.status.innerHTML = '<span class="invalid">Not a valid JWT — expected 3 dot-separated parts.</span>';
      return;
    }
    var header, payload;
    try {
      header = JSON.parse(b64urlToString(parts[0]));
    } catch (e) {
      reset();
      els.status.innerHTML = '<span class="invalid">Header is not valid Base64url JSON.</span>';
      return;
    }
    try {
      payload = JSON.parse(b64urlToString(parts[1]));
    } catch (e) {
      reset();
      els.status.innerHTML = '<span class="invalid">Payload is not valid Base64url JSON.</span>';
      return;
    }
    var alg = (header && header.alg) || 'none';
    current = { parts: parts, header: header, payload: payload, alg: alg };

    renderColored(parts);
    els.header.innerHTML = highlightJson(header);
    els.payload.innerHTML = highlightJson(payload);
    renderClaims(payload);
    els.signature.textContent = parts[2] || '(none)';
    els.decoded.classList.remove('d-none');

    setAlgUi(alg);
    els.verifyCard.classList.toggle('d-none', alg === 'none' || !parts[2]);
    els.status.innerHTML = '<span class="valid">✓ Decoded — ' + escapeHtml(alg) + '</span>';

    runVerify();
  }

  // --- Verification ---
  function pemToDer(pem) {
    var b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
    return b64ToBytes(b64);
  }

  var HMAC_HASH = { HS256: 'SHA-256', HS384: 'SHA-384', HS512: 'SHA-512' };
  var RSA_HASH = { RS256: 'SHA-256', RS384: 'SHA-384', RS512: 'SHA-512' };
  var PS_HASH = { PS256: 'SHA-256', PS384: 'SHA-384', PS512: 'SHA-512' };
  var EC_PARAMS = {
    ES256: { hash: 'SHA-256', curve: 'P-256' },
    ES384: { hash: 'SHA-384', curve: 'P-384' },
    ES512: { hash: 'SHA-512', curve: 'P-521' }
  };

  function showVerify(state, msg) {
    var cls = state === 'ok' ? 'valid' : (state === 'bad' ? 'invalid' : 'text-muted');
    var icon = state === 'ok' ? '✓ ' : (state === 'bad' ? '✗ ' : '');
    els.verifyResult.innerHTML = '<span class="' + cls + '">' + icon + escapeHtml(msg) + '</span>';
  }

  function runVerify() {
    if (!current || current.alg === 'none' || !current.parts[2]) return;
    var alg = current.alg;
    var signingInput = bytesFromString(current.parts[0] + '.' + current.parts[1]);
    var sig;
    try { sig = b64urlToBytes(current.parts[2]); }
    catch (e) { showVerify('bad', 'Signature is not valid Base64url.'); return; }

    if (HMAC_HASH[alg]) {
      var secretRaw = els.secret.value;
      if (!secretRaw) { showVerify('idle', 'Enter the shared secret to verify.'); return; }
      var keyBytes;
      try { keyBytes = els.secretB64.checked ? b64ToBytes(secretRaw) : bytesFromString(secretRaw); }
      catch (e) { showVerify('bad', 'Secret is not valid Base64.'); return; }
      crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: HMAC_HASH[alg] }, false, ['verify'])
        .then(function (key) { return crypto.subtle.verify('HMAC', key, sig, signingInput); })
        .then(function (ok) { showVerify(ok ? 'ok' : 'bad', ok ? 'Signature verified (' + alg + ').' : 'Signature does NOT match this secret.'); })
        .catch(function () { showVerify('bad', 'Could not verify with this secret.'); });
      return;
    }

    var pem = els.pubkey.value.trim();
    if (!pem) { showVerify('idle', 'Paste the public key (PEM) to verify.'); return; }
    var der;
    try { der = pemToDer(pem); }
    catch (e) { showVerify('bad', 'Public key is not valid PEM/Base64.'); return; }

    var importAlgo, verifyAlgo;
    if (RSA_HASH[alg]) {
      importAlgo = { name: 'RSASSA-PKCS1-v1_5', hash: RSA_HASH[alg] };
      verifyAlgo = { name: 'RSASSA-PKCS1-v1_5' };
    } else if (PS_HASH[alg]) {
      importAlgo = { name: 'RSA-PSS', hash: PS_HASH[alg] };
      verifyAlgo = { name: 'RSA-PSS', saltLength: { SHA256: 32, SHA384: 48, SHA512: 64 }[PS_HASH[alg].replace('-', '')] };
    } else if (EC_PARAMS[alg]) {
      importAlgo = { name: 'ECDSA', namedCurve: EC_PARAMS[alg].curve };
      verifyAlgo = { name: 'ECDSA', hash: EC_PARAMS[alg].hash };
    } else {
      showVerify('idle', 'Algorithm ' + alg + ' is decoded but not verifiable here.');
      return;
    }
    crypto.subtle.importKey('spki', der, importAlgo, false, ['verify'])
      .then(function (key) { return crypto.subtle.verify(verifyAlgo, key, sig, signingInput); })
      .then(function (ok) { showVerify(ok ? 'ok' : 'bad', ok ? 'Signature verified (' + alg + ').' : 'Signature does NOT match this public key.'); })
      .catch(function () { showVerify('bad', 'Could not verify — check the key matches ' + alg + '.'); });
  }

  // --- Share (token in URL hash, redacted on screen) ---
  function redact(token) {
    if (token.length <= 24) return token;
    return token.slice(0, 12) + '…[redacted]…' + token.slice(-8);
  }
  function share() {
    var token = els.input.value.trim();
    if (!token) { showToast('Nothing to share'); return; }
    var url = location.origin + location.pathname + '#jwt=' + encodeURIComponent(token);
    copyToClipboard(url);
    els.shareNote.textContent = 'Link copied (token redacted here): ' + location.pathname + '#jwt=' + redact(token) + '. The full link carries your token; share only with people you trust.';
    els.shareNote.classList.remove('d-none');
  }

  function loadFromHash() {
    var m = /[#&]jwt=([^&]+)/.exec(location.hash);
    if (m) {
      try { els.input.value = decodeURIComponent(m[1]); decode(); } catch (e) { /* ignore */ }
    }
  }

  els.input.addEventListener('input', decode);
  els.secret.addEventListener('input', runVerify);
  els.secretB64.addEventListener('change', runVerify);
  els.pubkey.addEventListener('input', runVerify);
  document.getElementById('btn-share').addEventListener('click', share);
  document.getElementById('btn-sample').addEventListener('click', function () { els.input.value = SAMPLE; decode(); });
  document.getElementById('btn-clear').addEventListener('click', function () {
    els.input.value = '';
    els.secret.value = '';
    els.pubkey.value = '';
    reset();
    els.status.innerHTML = '';
    if (location.hash) history.replaceState(null, '', location.pathname);
  });

  loadFromHash();
})();
