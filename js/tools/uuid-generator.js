(function() {
  'use strict';
  var currentVersion = '4';

  function randomBytes(n) {
    var arr = new Uint8Array(n);
    crypto.getRandomValues(arr);
    return arr;
  }

  function bytesToHex(bytes) {
    return Array.from(bytes, function(b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  function uuidv4() {
    var b = randomBytes(16);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    var h = bytesToHex(b);
    return h.substr(0,8)+'-'+h.substr(8,4)+'-'+h.substr(12,4)+'-'+h.substr(16,4)+'-'+h.substr(20,12);
  }

  // Fourni par le bloc <script> précédent. Absent si le moteur n'a pas BigInt :
  // ce bloc-là n'a alors pas parsé, et v1 est retiré de l'interface plus bas.
  var uuidv1 = window.__uuidV1Factory ? window.__uuidV1Factory(randomBytes, bytesToHex) : null;

  // Un lot tient dans une ou deux millisecondes : sans compteur, ses UUID ne
  // diffèrent que par de l'aléatoire et sortent dans le désordre. Les 12 bits
  // de rand_a portent donc un compteur monotone (RFC 9562 §6.2, méthode 1).
  var v7LastMs = -1;
  var v7Seq = 0;

  function uuidv7() {
    var now = Date.now();
    var b = randomBytes(16);
    // Départ sur 11 bits aléatoires : le bit haut reste libre, soit au moins
    // 2048 incréments avant de déborder sur la milliseconde suivante.
    var seed = ((b[6] & 0x07) << 8) | b[7];
    if (now > v7LastMs) {
      v7LastMs = now;
      v7Seq = seed;
    } else if (++v7Seq > 0xFFF) {
      // Même milliseconde (ou horloge qui recule) et compteur plein.
      v7LastMs++;
      v7Seq = seed;
    }
    var ms = v7LastMs;
    b[0] = (ms / 1099511627776) & 0xFF;
    b[1] = (ms / 4294967296) & 0xFF;
    b[2] = (ms / 16777216) & 0xFF;
    b[3] = (ms / 65536) & 0xFF;
    b[4] = (ms / 256) & 0xFF;
    b[5] = ms & 0xFF;
    b[6] = 0x70 | (v7Seq >> 8);
    b[7] = v7Seq & 0xFF;
    b[8] = (b[8] & 0x3F) | 0x80;
    var h = bytesToHex(b);
    return h.substr(0,8)+'-'+h.substr(8,4)+'-'+h.substr(12,4)+'-'+h.substr(16,4)+'-'+h.substr(20,12);
  }

  function generateUUID() {
    switch (currentVersion) {
      case '1': return uuidv1 ? uuidv1() : uuidv4();
      case '7': return uuidv7();
      default: return uuidv4();
    }
  }

  function formatUUID(uuid) {
    if ($('#opt-no-dashes').checked) uuid = uuid.replace(/-/g, '');
    if ($('#opt-uppercase').checked) uuid = uuid.toUpperCase();
    if ($('#opt-braces').checked) uuid = '{' + uuid + '}';
    return uuid;
  }

  function generateSingle() {
    $('#single-uuid').textContent = formatUUID(generateUUID());
  }

  function copySingle() {
    var uuid = $('#single-uuid').textContent;
    if (uuid) {
      navigator.clipboard.writeText(uuid);
      $('#copy-status').innerHTML = '<span class="valid">Copied!</span>';
      setTimeout(function() { $('#copy-status').innerHTML = ''; }, 1500);
    }
  }

  function generateBulk() {
    var count = Math.min(parseInt($('#bulk-count').value) || 10, 1000);
    var uuids = Array.from({ length: count }, function() { return formatUUID(generateUUID()); });
    $('#bulk-output').value = uuids.join('\n');
  }

  function copyBulk() {
    var text = $('#bulk-output').value;
    if (text) navigator.clipboard.writeText(text);
  }

  function downloadBulk() {
    var text = $('#bulk-output').value;
    if (text) downloadText(text, 'uuids.txt');
  }

  function validateUUID() {
    var val = $('#validate-input').value.trim();
    var result = $('#validate-result');
    if (!val) { result.innerHTML = ''; return; }
    var clean = val.replace(/^\{|\}$/g, '');
    var match = clean.match(/^([0-9a-f]{8})-?([0-9a-f]{4})-?([0-9a-f])([0-9a-f]{3})-?([0-9a-f])([0-9a-f]{3})-?([0-9a-f]{12})$/i);
    if (!match) {
      result.innerHTML = '<span class="invalid">✗ Invalid UUID format</span>';
      return;
    }
    var version = parseInt(match[3], 16);
    var variantNibble = parseInt(match[5], 16);
    var variant;
    if ((variantNibble & 0x8) === 0) variant = 'NCS';
    else if ((variantNibble & 0xC) === 0x8) variant = 'RFC 4122';
    else if ((variantNibble & 0xE) === 0xC) variant = 'Microsoft';
    else variant = 'Reserved';
    result.innerHTML = '<span class="valid">✓ Valid UUID</span> — Version ' + version + ', Variant: ' + variant;
  }

  // Version toggle buttons
  var versionBtns = $$('.uuid-version-btn');

  // Pas de BigInt → v1 est impossible à calculer. On désactive l'option au
  // lieu de laisser un bouton qui rendrait silencieusement un v4.
  if (!uuidv1) {
    versionBtns.forEach(function(btn) {
      if (btn.getAttribute('data-version') !== '1') return;
      btn.disabled = true;
      btn.title = 'Requires a browser with BigInt support';
    });
  }

  versionBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      currentVersion = btn.getAttribute('data-version');
      versionBtns.forEach(function(b) {
        b.classList.remove('active', 'btn-primary');
        b.classList.add('btn-secondary');
      });
      btn.classList.add('active', 'btn-primary');
      btn.classList.remove('btn-secondary');
      generateSingle();
    });
  });

  // Format option change → regenerate
  ['opt-uppercase', 'opt-no-dashes', 'opt-braces'].forEach(function(id) {
    $('#' + id).addEventListener('change', generateSingle);
  });

  $('#validate-input').addEventListener('input', validateUUID);
  $('#btn-generate').addEventListener('click', generateSingle);
  $('#btn-copy-single').addEventListener('click', copySingle);
  $('#single-uuid').addEventListener('click', copySingle);
  $('#btn-bulk-generate').addEventListener('click', generateBulk);
  $('#btn-bulk-copy').addEventListener('click', copyBulk);
  $('#btn-bulk-download').addEventListener('click', downloadBulk);

  generateSingle();
})();
