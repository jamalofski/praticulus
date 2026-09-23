(function () {
  'use strict';
  // Le QR est un extra : generer les codes TOTP ne depend d'aucune lib. Si le
  // vendor n'a pas charge, on degrade le QR au lieu de tuer tout le script.
  var HAS_QR = typeof qrcode !== 'undefined';
  if (HAS_QR) { qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8']; }

  var SAMPLE = 'JBSWY3DPEHPK3PXP';

  var els = {
    secret: document.getElementById('totp-secret'),
    secretStatus: document.getElementById('totp-secret-status'),
    digits: document.getElementById('totp-digits'),
    period: document.getElementById('totp-period'),
    algo: document.getElementById('totp-algo'),
    code: document.getElementById('totp-code'),
    fill: document.getElementById('totp-fill'),
    countdownText: document.getElementById('totp-countdown-text'),
    account: document.getElementById('totp-account'),
    issuer: document.getElementById('totp-issuer'),
    qrCanvas: document.getElementById('totp-qr'),
    qrPlaceholder: document.getElementById('totp-qr-placeholder'),
    uri: document.getElementById('totp-uri')
  };

  var state = { secretBytes: null, lastCounter: null, lastKey: '', currentCode: '' };

  function base32ToBytes(b32) {
    var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    var clean = b32.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
    if (!clean) return null;
    var bits = 0, value = 0, out = [];
    for (var i = 0; i < clean.length; i++) {
      var idx = alphabet.indexOf(clean[i]);
      if (idx === -1) return null;
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) { out.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
    }
    return new Uint8Array(out);
  }

  function counterBytes(counter) {
    var buf = new Uint8Array(8);
    for (var i = 7; i >= 0; i--) { buf[i] = counter & 0xff; counter = Math.floor(counter / 256); }
    return buf;
  }

  function truncate(hmac, digits) {
    var offset = hmac[hmac.length - 1] & 0x0f;
    var bin = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16)
      | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff);
    var code = (bin % Math.pow(10, digits)).toString();
    while (code.length < digits) code = '0' + code;
    return code;
  }

  function generate(secretBytes, counter, digits, hashAlgo) {
    return crypto.subtle.importKey('raw', secretBytes, { name: 'HMAC', hash: hashAlgo }, false, ['sign'])
      .then(function (key) { return crypto.subtle.sign('HMAC', key, counterBytes(counter)); })
      .then(function (buf) { return truncate(new Uint8Array(buf), digits); });
  }

  function groupCode(code) {
    var mid = Math.ceil(code.length / 2);
    return code.slice(0, mid) + ' ' + code.slice(mid);
  }

  function renderQr(text) {
    var qr;
    if (!HAS_QR) {
      els.qrCanvas.classList.add('d-none');
      els.qrPlaceholder.classList.remove('d-none');
      els.qrPlaceholder.textContent = 'QR code unavailable — reload the page. Codes above are unaffected.';
      return;
    }
    try { qr = qrcode(0, 'M'); qr.addData(text); qr.make(); }
    catch (e) {
      els.qrCanvas.classList.add('d-none');
      els.qrPlaceholder.classList.remove('d-none');
      els.qrPlaceholder.textContent = 'Secret too long to fit a QR code.';
      return;
    }
    var QUIET = 4;
    var count = qr.getModuleCount();
    var total = count + QUIET * 2;
    var cell = Math.max(2, Math.floor(240 / total));
    var dim = cell * total;
    els.qrCanvas.width = dim;
    els.qrCanvas.height = dim;
    var ctx = els.qrCanvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, dim, dim);
    ctx.fillStyle = '#000';
    for (var r = 0; r < count; r++) {
      for (var c = 0; c < count; c++) {
        if (qr.isDark(r, c)) ctx.fillRect((c + QUIET) * cell, (r + QUIET) * cell, cell, cell);
      }
    }
    els.qrCanvas.classList.remove('d-none');
    els.qrPlaceholder.classList.add('d-none');
  }

  function buildUri() {
    var secret = els.secret.value.toUpperCase().replace(/\s+/g, '').replace(/=+$/, '');
    var account = els.account.value.trim().replace(/:/g, '');
    var issuer = els.issuer.value.trim().replace(/:/g, '');
    var label = (issuer ? issuer + ':' : '') + (account || 'Praticulus');
    var params = ['secret=' + secret];
    if (issuer) params.push('issuer=' + encodeURIComponent(issuer));
    params.push('algorithm=' + els.algo.value.replace('-', ''));
    params.push('digits=' + els.digits.value);
    params.push('period=' + els.period.value);
    return 'otpauth://totp/' + encodeURIComponent(label) + '?' + params.join('&');
  }

  function inputKey() {
    return els.secret.value + '|' + els.digits.value + '|' + els.period.value + '|' + els.algo.value;
  }

  function refreshSecret() {
    var bytes = base32ToBytes(els.secret.value);
    if (els.secret.value.trim() === '') {
      state.secretBytes = null;
      els.secretStatus.innerHTML = '';
      els.code.textContent = 'Enter a Base32 secret above';
      els.code.classList.add('totp-invalid');
      els.qrCanvas.classList.add('d-none');
      els.qrPlaceholder.classList.remove('d-none');
      els.qrPlaceholder.textContent = 'A QR code appears once you enter a valid secret.';
      els.uri.textContent = '—';
      els.countdownText.innerHTML = '';
      els.fill.style.width = '0%';
      return;
    }
    if (!bytes || bytes.length === 0) {
      state.secretBytes = null;
      els.secretStatus.innerHTML = '<span class="invalid">Not a valid Base32 secret (use A–Z and 2–7).</span>';
      els.code.textContent = 'Invalid secret';
      els.code.classList.add('totp-invalid');
      els.qrCanvas.classList.add('d-none');
      els.qrPlaceholder.classList.remove('d-none');
      els.qrPlaceholder.textContent = 'Enter a valid Base32 secret to get a QR code.';
      els.uri.textContent = '—';
      els.countdownText.innerHTML = '';
      els.fill.style.width = '0%';
      return;
    }
    state.secretBytes = bytes;
    state.lastCounter = null;
    els.secretStatus.innerHTML = '<span class="valid">✓ Valid Base32 (' + bytes.length + ' bytes)</span>';
    els.code.classList.remove('totp-invalid');
    var uri = buildUri();
    els.uri.textContent = uri;
    renderQr(uri);
  }

  function tick() {
    if (!state.secretBytes) return;
    var period = parseInt(els.period.value, 10);
    var digits = parseInt(els.digits.value, 10);
    var algo = els.algo.value;
    var epoch = Math.floor(Date.now() / 1000);
    var counter = Math.floor(epoch / period);
    var remaining = period - (epoch % period);

    els.fill.style.width = (remaining / period * 100) + '%';
    els.fill.classList.toggle('totp-crit', remaining <= 5);
    els.fill.classList.toggle('totp-low', remaining > 5 && remaining <= 10);
    els.countdownText.innerHTML = '<span class="text-muted">Valid for ' + remaining + 's · refreshes every ' + period + 's</span>';

    var key = inputKey();
    if (counter !== state.lastCounter || key !== state.lastKey) {
      state.lastCounter = counter;
      state.lastKey = key;
      generate(state.secretBytes, counter, digits, algo).then(function (code) {
        state.currentCode = code;
        els.code.textContent = groupCode(code);
        els.code.classList.remove('totp-invalid');
      }).catch(function () {
        els.code.textContent = 'Error';
        els.code.classList.add('totp-invalid');
      });
    }
  }

  function onConfigChange() {
    if (state.secretBytes) {
      els.uri.textContent = buildUri();
      renderQr(buildUri());
    }
    state.lastKey = '';
    tick();
  }

  els.secret.addEventListener('input', function () { refreshSecret(); tick(); });
  els.digits.addEventListener('change', onConfigChange);
  els.period.addEventListener('change', onConfigChange);
  els.algo.addEventListener('change', onConfigChange);
  els.account.addEventListener('input', function () { if (state.secretBytes) { els.uri.textContent = buildUri(); renderQr(buildUri()); } });
  els.issuer.addEventListener('input', function () { if (state.secretBytes) { els.uri.textContent = buildUri(); renderQr(buildUri()); } });

  function copyCode() {
    if (state.currentCode) copyToClipboard(state.currentCode);
    else showToast('No code yet');
  }
  els.code.addEventListener('click', copyCode);
  document.getElementById('btn-copy-code').addEventListener('click', copyCode);
  document.getElementById('btn-sample').addEventListener('click', function () {
    els.secret.value = SAMPLE; refreshSecret(); tick();
  });
  els.uri.addEventListener('click', function () {
    if (els.uri.textContent && els.uri.textContent !== '—') copyToClipboard(els.uri.textContent);
  });
  els.uri.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); els.uri.click(); }
  });

  refreshSecret();
  tick();
  setInterval(tick, 1000);
})();
