(function () {
  'use strict';
  var dropZone = document.getElementById('drop-zone');
  var fileInput = document.getElementById('file-input');
  var quality = document.getElementById('quality');
  var qualityVal = document.getElementById('quality-val');
  var formatSel = document.getElementById('format');
  var status = document.getElementById('status');
  var pngNote = document.getElementById('png-note');
  var resultCard = document.getElementById('result-card');
  var resultsEl = document.getElementById('results');
  var totalStat = document.getElementById('total-stat');

  var items = [];   // { name, outUrl, outSize, outType }

  function formatBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(2) + ' MB';
  }

  function extFor(type) {
    if (type === 'image/jpeg') return 'jpg';
    if (type === 'image/webp') return 'webp';
    if (type === 'image/png') return 'png';
    return 'img';
  }

  function readAsDataURL(file) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(r.result); };
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  function loadImage(url) {
    return new Promise(function (res, rej) {
      var img = new Image();
      img.onload = function () { res(img); };
      img.onerror = function () { rej(new Error('decode failed')); };
      img.src = url;
    });
  }

  function blobToDataURL(blob) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(r.result); };
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  }

  function dataUrlBytes(url) {
    var b64 = url.split(',')[1] || '';
    var pad = b64.charAt(b64.length - 1) === '=' ? (b64.charAt(b64.length - 2) === '=' ? 2 : 1) : 0;
    return Math.round(b64.length * 3 / 4) - pad;
  }

  async function compressOne(file) {
    var origUrl = await readAsDataURL(file);
    var img = await loadImage(origUrl);
    var type = formatSel.value === 'auto' ? (file.type || 'image/jpeg') : formatSel.value;
    if (!/^image\/(jpeg|webp|png)$/.test(type)) type = 'image/jpeg';
    var q = type === 'image/png' ? undefined : (parseInt(quality.value, 10) / 100);
    var w = img.naturalWidth, h = img.naturalHeight;
    var outUrl, outSize;
    if (typeof OffscreenCanvas === 'function' && OffscreenCanvas.prototype.convertToBlob) {
      var oc = new OffscreenCanvas(w, h);
      oc.getContext('2d').drawImage(img, 0, 0);
      var blob = await oc.convertToBlob({ type: type, quality: q });
      outSize = blob.size;
      outUrl = await blobToDataURL(blob);
    } else {
      var cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0);
      outUrl = cv.toDataURL(type, q);
      outSize = dataUrlBytes(outUrl);
    }
    var base = file.name.replace(/\.[^.]+$/, '');
    return { name: base + '.' + extFor(type), outUrl: outUrl, outSize: outSize, outType: type,
      origUrl: origUrl, origSize: file.size, w: w, h: h };
  }

  function renderItem(r) {
    var saved = r.origSize - r.outSize;
    var pct = r.origSize ? Math.round(saved / r.origSize * 100) : 0;
    var badge = saved > 0
      ? '<span class="save-badge save-good">−' + pct + '%</span>'
      : '<span class="save-badge save-bad">+' + Math.abs(pct) + '%</span>';
    var div = document.createElement('div');
    div.className = 'result-item';
    div.innerHTML =
      '<div class="compare-grid">' +
        '<div class="compare-col"><img class="file-preview-img" src="' + r.origUrl + '" alt="Original"><span class="compare-cap">Original · ' + formatBytes(r.origSize) + '</span></div>' +
        '<span class="compare-arrow" aria-hidden="true">&rarr;</span>' +
        '<div class="compare-col"><img class="file-preview-img" src="' + r.outUrl + '" alt="Compressed"><span class="compare-cap">' + extFor(r.outType).toUpperCase() + ' · ' + formatBytes(r.outSize) + ' ' + badge + '</span></div>' +
      '</div>' +
      '<div class="result-meta"><span class="result-name">' + escapeHtml(r.name) + ' <span class="dim">' + r.w + '×' + r.h + '</span></span>' +
      '<a class="btn btn-secondary btn-sm" href="' + r.outUrl + '" download="' + escapeHtml(r.name) + '">Download</a></div>';
    resultsEl.appendChild(div);
  }

  async function handleFiles(files) {
    var list = Array.prototype.slice.call(files).filter(function (f) { return /^image\//.test(f.type); });
    if (!list.length) { status.innerHTML = '<span class="invalid">No images selected.</span>'; return; }
    resultsEl.innerHTML = ''; items = [];
    resultCard.classList.remove('d-none');
    var origTotal = 0, outTotal = 0;
    for (var i = 0; i < list.length; i++) {
      status.innerHTML = '<span class="valid">Compressing ' + (i + 1) + ' / ' + list.length + '…</span>';
      try {
        var r = await compressOne(list[i]);
        renderItem(r);
        items.push(r);
        origTotal += r.origSize; outTotal += r.outSize;
      } catch (e) {
        var d = document.createElement('div');
        d.className = 'result-item';
        d.innerHTML = '<span class="invalid">Could not process ' + escapeHtml(list[i].name) + '.</span>';
        resultsEl.appendChild(d);
      }
    }
    var savedPct = origTotal ? Math.round((origTotal - outTotal) / origTotal * 100) : 0;
    totalStat.innerHTML = '<b>' + items.length + '</b> image' + (items.length > 1 ? 's' : '') +
      ' · ' + formatBytes(origTotal) + ' → ' + formatBytes(outTotal) +
      ' <span class="save-badge ' + (savedPct >= 0 ? 'save-good">−' + savedPct : 'save-bad">+' + Math.abs(savedPct)) + '%</span>';
    status.innerHTML = '<span class="valid">Done — ' + items.length + ' compressed.</span>';
  }

  function updatePngNote() {
    var t = formatSel.value;
    var pngActive = t === 'image/png';
    pngNote.innerHTML = pngActive ? 'PNG is lossless — the quality slider has no effect. Convert to JPEG or WebP for smaller photos.' : '';
    quality.disabled = pngActive;
  }

  quality.addEventListener('input', function () { qualityVal.textContent = quality.value + '%'; });
  formatSel.addEventListener('change', updatePngNote);
  dropZone.addEventListener('click', function () { fileInput.click(); });
  fileInput.addEventListener('change', function () { if (fileInput.files.length) handleFiles(fileInput.files); });
  dropZone.addEventListener('dragover', function (e) { e.preventDefault(); dropZone.classList.add('drop-zone-active'); });
  dropZone.addEventListener('dragleave', function () { dropZone.classList.remove('drop-zone-active'); });
  dropZone.addEventListener('drop', function (e) {
    e.preventDefault(); dropZone.classList.remove('drop-zone-active');
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  });
  document.getElementById('btn-all').addEventListener('click', function () {
    items.forEach(function (r, i) {
      setTimeout(function () {
        var a = document.createElement('a');
        a.href = r.outUrl; a.download = r.name; a.click();
      }, i * 200);
    });
  });
  document.getElementById('btn-reset').addEventListener('click', function () {
    resultsEl.innerHTML = ''; items = []; resultCard.classList.add('d-none'); status.innerHTML = ''; fileInput.value = '';
  });

  updatePngNote();
})();
