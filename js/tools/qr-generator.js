(function() {
  'use strict';
  // Sans la lib, le reste du script (formulaires, options, presets) doit rester
  // vivant : on signale dans render() au lieu de mourir sur la premiere ligne.
  var HAS_QR = typeof qrcode !== 'undefined';
  if (HAS_QR) { qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8']; }
  var QUIET = 4;
  var LOGO_RATIO = 0.22;
  var LEVEL_WORD = { L: 'Low', M: 'Medium', Q: 'High', H: 'Highest' };
  var mode = 'text';
  var lastQr = null;
  var logoImg = null;
  var logoDataUrl = null;
  var canvas = document.getElementById('qr-canvas');
  var placeholder = document.getElementById('qr-placeholder');
  var status = document.getElementById('qr-status');
  var ecSel = document.getElementById('qr-ec');
  var styleSel = document.getElementById('qr-style');
  var fgInput = document.getElementById('qr-fg');
  var bgInput = document.getElementById('qr-bg');
  var timer = null;

  function gv(id) { return document.getElementById(id).value.trim(); }
  function wifiEsc(s) { return s.replace(/([\\;,:"])/g, '\\$1'); }
  function icalDate(v) { return v ? v.replace(/[-:]/g, '') + '00' : ''; }

  function payload() {
    if (mode === 'text') return document.getElementById('qr-text').value;
    if (mode === 'wifi') {
      var ssid = document.getElementById('wifi-ssid').value;
      if (!ssid) return '';
      var enc = document.getElementById('wifi-enc').value;
      var pass = document.getElementById('wifi-pass').value;
      var hidden = document.getElementById('wifi-hidden').checked;
      var s = 'WIFI:T:' + enc + ';S:' + wifiEsc(ssid) + ';';
      if (enc !== 'nopass') s += 'P:' + wifiEsc(pass) + ';';
      if (hidden) s += 'H:true;';
      return s + ';';
    }
    if (mode === 'email') {
      var to = gv('email-to');
      if (!to) return '';
      var q = [];
      var subj = gv('email-subject');
      var body = gv('email-body');
      if (subj) q.push('subject=' + encodeURIComponent(subj));
      if (body) q.push('body=' + encodeURIComponent(body));
      return 'mailto:' + to + (q.length ? '?' + q.join('&') : '');
    }
    if (mode === 'sms') {
      var num = gv('sms-to');
      if (!num) return '';
      var msg = gv('sms-body');
      return 'SMSTO:' + num + (msg ? ':' + msg : '');
    }
    if (mode === 'phone') {
      var p = gv('phone-to');
      return p ? 'tel:' + p : '';
    }
    if (mode === 'whatsapp') {
      var digits = gv('wa-to').replace(/[^0-9]/g, '');
      if (!digits) return '';
      var t = gv('wa-body');
      return 'https://wa.me/' + digits + (t ? '?text=' + encodeURIComponent(t) : '');
    }
    if (mode === 'geo') {
      var lat = gv('geo-lat');
      var lng = gv('geo-lng');
      if (!lat || !lng) return '';
      return 'geo:' + lat + ',' + lng;
    }
    if (mode === 'event') {
      var title = gv('ev-title');
      if (!title) return '';
      var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', 'SUMMARY:' + title];
      var st = icalDate(gv('ev-start'));
      var en = icalDate(gv('ev-end'));
      var loc = gv('ev-location');
      var desc = gv('ev-desc');
      if (st) lines.push('DTSTART:' + st);
      if (en) lines.push('DTEND:' + en);
      if (loc) lines.push('LOCATION:' + loc);
      if (desc) lines.push('DESCRIPTION:' + desc);
      lines.push('END:VEVENT', 'END:VCALENDAR');
      return lines.join('\n');
    }
    // vcard
    var f = {
      FN: document.getElementById('vc-name').value,
      TEL: document.getElementById('vc-phone').value,
      EMAIL: document.getElementById('vc-email').value,
      ORG: document.getElementById('vc-org').value,
      URL: document.getElementById('vc-url').value
    };
    if (!f.FN && !f.TEL && !f.EMAIL) return '';
    var v = ['BEGIN:VCARD', 'VERSION:3.0'];
    if (f.FN) v.push('N:' + f.FN, 'FN:' + f.FN);
    if (f.TEL) v.push('TEL:' + f.TEL);
    if (f.EMAIL) v.push('EMAIL:' + f.EMAIL);
    if (f.ORG) v.push('ORG:' + f.ORG);
    if (f.URL) v.push('URL:' + f.URL);
    v.push('END:VCARD');
    return v.join('\n');
  }

  function setEnabled(on) {
    document.getElementById('btn-png').disabled = !on;
    document.getElementById('btn-svg').disabled = !on;
    var copy = document.getElementById('btn-copy');
    if (copy) copy.disabled = !on;
  }

  function relLum(hex) {
    var c = hex.replace('#', '');
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    var ch = [0, 2, 4].map(function (i) {
      var x = parseInt(c.substr(i, 2), 16) / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  }

  function contrastWarning() {
    var lf = relLum(fgInput.value);
    var lb = relLum(bgInput.value);
    if (lb < lf) return 'Background is darker than the modules — many scanners fail on inverted codes.';
    var ratio = (Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05);
    if (ratio < 3) return 'Low contrast (' + ratio.toFixed(1) + ':1) — the code may not scan.';
    return '';
  }

  // Finder patterns ("eyes") — kept solid so styled modules stay scannable
  function isFinder(r, c, n) {
    return (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function render() {
    if (!HAS_QR) {
      canvas.classList.add('d-none');
      placeholder.classList.remove('d-none');
      placeholder.textContent = 'QR engine failed to load — reload the page.';
      setEnabled(false);
      return;
    }
    var text = payload();
    if (!text) {
      lastQr = null;
      canvas.classList.add('d-none');
      placeholder.classList.remove('d-none');
      status.innerHTML = '';
      setEnabled(false);
      return;
    }
    var level = ecSel.value;
    var qr;
    try {
      qr = qrcode(0, level);
      qr.addData(text);
      qr.make();
    } catch (e) {
      lastQr = null;
      canvas.classList.add('d-none');
      placeholder.classList.add('d-none');
      status.innerHTML = '<span class="invalid">Content too long for a single QR code — shorten it or lower the error-correction level.</span>';
      setEnabled(false);
      return;
    }
    lastQr = qr;
    var fg = fgInput.value;
    var bg = bgInput.value;
    var style = styleSel.value;
    var count = qr.getModuleCount();
    var total = count + QUIET * 2;
    var target = parseInt(document.getElementById('qr-size').value, 10);
    var cell = Math.max(1, Math.floor(target / total));
    var dim = cell * total;
    canvas.width = dim;
    canvas.height = dim;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, dim, dim);
    ctx.fillStyle = fg;
    for (var r = 0; r < count; r++) {
      for (var c = 0; c < count; c++) {
        if (!qr.isDark(r, c)) continue;
        var x = (c + QUIET) * cell;
        var y = (r + QUIET) * cell;
        if (style === 'square' || isFinder(r, c, count)) {
          ctx.fillRect(x, y, cell, cell);
        } else if (style === 'dots') {
          ctx.beginPath();
          ctx.arc(x + cell / 2, y + cell / 2, cell / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          roundRectPath(ctx, x, y, cell, cell, cell * 0.3);
          ctx.fill();
        }
      }
    }
    if (logoImg) {
      var ls = Math.round(dim * LOGO_RATIO);
      var pad = Math.round(ls * 0.12);
      var off = Math.round((dim - ls) / 2);
      ctx.fillStyle = bg;
      ctx.fillRect(off - pad, off - pad, ls + pad * 2, ls + pad * 2);
      ctx.drawImage(logoImg, off, off, ls, ls);
    }
    canvas.style.imageRendering = (style === 'square') ? '' : 'auto';
    canvas.classList.remove('d-none');
    placeholder.classList.add('d-none');
    var warn = contrastWarning();
    status.innerHTML = '<span class="text-muted">' + count + '×' + count + ' modules · ' + (LEVEL_WORD[level] || level) + ' · ' + dim + 'px</span>'
      + (warn ? ' <span class="invalid">· ' + warn + '</span>' : '');
    setEnabled(true);
  }

  function buildSvg(qr) {
    var fg = fgInput.value;
    var bg = bgInput.value;
    var style = styleSel.value;
    var count = qr.getModuleCount();
    var total = count + QUIET * 2;
    var shapes = '';
    for (var r = 0; r < count; r++) {
      for (var c = 0; c < count; c++) {
        if (!qr.isDark(r, c)) continue;
        var x = c + QUIET;
        var y = r + QUIET;
        if (style === 'square' || isFinder(r, c, count)) {
          shapes += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>';
        } else if (style === 'dots') {
          shapes += '<circle cx="' + (x + 0.5) + '" cy="' + (y + 0.5) + '" r="0.5"/>';
        } else {
          shapes += '<rect x="' + x + '" y="' + y + '" width="1" height="1" rx="0.3" ry="0.3"/>';
        }
      }
    }
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ' + total + ' ' + total + '" width="' + (total * 10) + '" height="' + (total * 10) + '" shape-rendering="geometricPrecision">';
    svg += '<rect width="100%" height="100%" fill="' + bg + '"/>';
    svg += '<g fill="' + fg + '">' + shapes + '</g>';
    if (logoDataUrl) {
      var ls = total * LOGO_RATIO;
      var pad = ls * 0.12;
      var off = (total - ls) / 2;
      svg += '<rect x="' + (off - pad) + '" y="' + (off - pad) + '" width="' + (ls + pad * 2) + '" height="' + (ls + pad * 2) + '" fill="' + bg + '"/>';
      svg += '<image xlink:href="' + logoDataUrl + '" x="' + off + '" y="' + off + '" width="' + ls + '" height="' + ls + '" preserveAspectRatio="xMidYMid meet"/>';
    }
    return svg + '</svg>';
  }

  function downloadBlob(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function schedule() { clearTimeout(timer); timer = setTimeout(render, 150); }

  var MODES = ['text', 'wifi', 'vcard', 'email', 'sms', 'phone', 'whatsapp', 'geo', 'event'];
  function setMode(m) {
    mode = m;
    MODES.forEach(function (id) {
      document.getElementById('tab-' + id).className = 'btn btn-sm ' + (id === m ? 'btn-primary' : 'btn-secondary');
      document.getElementById('panel-' + id).classList.toggle('d-none', id !== m);
    });
    render();
  }

  document.querySelectorAll('.qr-tabs button').forEach(function (b) {
    b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); });
  });
  ['qr-text', 'wifi-ssid', 'wifi-pass', 'wifi-enc', 'wifi-hidden', 'vc-name', 'vc-phone', 'vc-email', 'vc-org', 'vc-url',
   'email-to', 'email-subject', 'email-body', 'sms-to', 'sms-body', 'phone-to', 'wa-to', 'wa-body',
   'geo-lat', 'geo-lng', 'ev-title', 'ev-location', 'ev-start', 'ev-end', 'ev-desc',
   'qr-ec', 'qr-style', 'qr-size', 'qr-fg', 'qr-bg'].forEach(function (id) {
    var el = document.getElementById(id);
    el.addEventListener('input', schedule);
    el.addEventListener('change', schedule);
  });

  // Logo upload — read locally, never uploaded
  var logoInput = document.getElementById('qr-logo');
  var logoPreview = document.getElementById('qr-logo-preview');
  var logoClear = document.getElementById('btn-logo-clear');
  var logoLabelText = document.getElementById('logo-label-text');
  logoInput.addEventListener('change', function () {
    var file = logoInput.files && logoInput.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var url = reader.result;
      var img = new Image();
      img.onload = function () {
        logoImg = img;
        logoDataUrl = url;
        logoPreview.src = url;
        logoPreview.classList.remove('d-none');
        logoClear.classList.remove('d-none');
        logoLabelText.textContent = 'Change logo';
        ecSel.value = 'H';
        ecSel.disabled = true;
        render();
      };
      img.onerror = function () {
        status.innerHTML = '<span class="invalid">Could not load that image.</span>';
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  });
  logoClear.addEventListener('click', function () {
    logoImg = null;
    logoDataUrl = null;
    logoInput.value = '';
    logoPreview.src = '';
    logoPreview.classList.add('d-none');
    logoClear.classList.add('d-none');
    logoLabelText.textContent = 'Add logo';
    ecSel.disabled = false;
    render();
  });

  document.getElementById('btn-png').addEventListener('click', function () {
    if (!lastQr) return;
    canvas.toBlob(function (blob) { downloadBlob(blob, 'qrcode.png'); }, 'image/png');
  });
  document.getElementById('btn-svg').addEventListener('click', function () {
    if (!lastQr) return;
    downloadBlob(new Blob([buildSvg(lastQr)], { type: 'image/svg+xml' }), 'qrcode.svg');
  });

  var copyBtn = document.getElementById('btn-copy');
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard || !navigator.clipboard.write) {
    copyBtn.classList.add('d-none');
  } else {
    copyBtn.addEventListener('click', function () {
      if (!lastQr) return;
      canvas.toBlob(function (blob) {
        if (!blob) return;
        navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          .then(function () { showToast('Copied!'); })
          .catch(function () { showToast('Copy failed'); });
      }, 'image/png');
    });
  }

  document.getElementById('qr-text').value = 'https://praticulus.com/qr-generator/';
  render();
})();
