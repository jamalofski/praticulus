(function () {
  'use strict';
  var input = document.getElementById('input');
  var status = document.getElementById('status');
  var resultCard = document.getElementById('result-card');
  var kvList = document.getElementById('kv-list');
  var kvTz = document.getElementById('kv-tz');
  var tzSelect = document.getElementById('tz');
  var batch = document.getElementById('batch');
  var batchWrap = document.getElementById('batch-wrap');
  var batchBody = document.getElementById('batch-body');
  var lastDate = null;

  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Build timezone list (native list when available, curated fallback).
  var localTz = 'UTC';
  try { localTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) {}
  var zones;
  try { zones = (typeof Intl.supportedValuesOf === 'function') ? Intl.supportedValuesOf('timeZone') : null; } catch (e) { zones = null; }
  if (!zones) {
    zones = ['UTC', 'America/New_York', 'America/Los_Angeles', 'America/Chicago', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata', 'Australia/Sydney'];
  }
  if (zones.indexOf(localTz) === -1) zones.unshift(localTz);
  zones.forEach(function (z) {
    var opt = document.createElement('option');
    opt.value = z; opt.textContent = z;
    if (z === localTz) opt.selected = true;
    tzSelect.appendChild(opt);
  });

  function parseInput(raw) {
    raw = raw.trim();
    if (!raw) return null;
    if (/^-?\d+$/.test(raw)) {
      var digits = raw.replace('-', '').length;
      var num = Number(raw);
      var ms;
      if (digits <= 11) ms = num * 1000;        // seconds
      else if (digits <= 14) ms = num;          // milliseconds
      else ms = Math.round(num / 1000);         // microseconds
      var d = new Date(ms);
      return isNaN(d.getTime()) ? null : d;
    }
    var parsed = new Date(raw);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  function relative(date) {
    var diff = date.getTime() - Date.now();
    var future = diff > 0;
    var s = Math.abs(diff) / 1000;
    var units = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1]];
    for (var i = 0; i < units.length; i++) {
      var v = Math.floor(s / units[i][1]);
      if (v >= 1) {
        var lbl = v + ' ' + units[i][0] + (v > 1 ? 's' : '');
        return future ? 'in ' + lbl : lbl + ' ago';
      }
    }
    return 'just now';
  }

  function inZone(date, tz) {
    try {
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: tz, weekday: 'short', year: 'numeric', month: 'short', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZoneName: 'short'
      }).format(date);
    } catch (e) { return 'Invalid timezone'; }
  }

  function row(label, value) {
    return '<div class="kv-row"><span class="kv-label">' + label + '</span>' +
      '<span class="kv-value">' + escapeHtml(value) + '<button class="kv-copy" type="button" data-copy="' + escapeHtml(value) + '" aria-label="Copy">Copy</button></span></div>';
  }

  function render(date) {
    lastDate = date;
    var secs = Math.floor(date.getTime() / 1000);
    kvList.innerHTML =
      row('Unix (seconds)', String(secs)) +
      row('Unix (milliseconds)', String(date.getTime())) +
      row('ISO 8601 (UTC)', date.toISOString()) +
      row('UTC', date.toUTCString()) +
      row('Local time', date.toString()) +
      row('Day of week', DAYS[date.getDay()]) +
      row('Relative', relative(date));
    renderTz(date);
    resultCard.classList.remove('d-none');
    status.innerHTML = '<span class="valid">Parsed successfully.</span>';
  }

  function renderTz(date) {
    kvTz.innerHTML = row(tzSelect.value, inZone(date, tzSelect.value));
  }

  function convert() {
    var date = parseInput(input.value);
    if (!date) {
      resultCard.classList.add('d-none');
      status.innerHTML = input.value.trim() ? '<span class="invalid">Could not parse that timestamp or date.</span>' : '';
      return;
    }
    render(date);
  }

  function setNow() {
    input.value = String(Math.floor(Date.now() / 1000));
    convert();
  }

  function share() {
    var raw = input.value.trim();
    if (!raw) { showToast('Nothing to share'); return; }
    location.hash = 't=' + encodeURIComponent(raw);
    copyToClipboard(location.href, document.getElementById('btn-share'));
  }

  function clearAll() {
    input.value = '';
    resultCard.classList.add('d-none');
    status.innerHTML = '';
    if (location.hash) history.replaceState(null, '', location.pathname);
  }

  function runBatch() {
    var lines = batch.value.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    if (!lines.length) { batchWrap.classList.add('d-none'); return; }
    batchBody.innerHTML = lines.map(function (line) {
      var d = parseInput(line);
      if (!d) return '<tr><td>' + escapeHtml(line) + '</td><td colspan="3" class="cell-error">unparseable</td></tr>';
      return '<tr><td>' + escapeHtml(line) + '</td><td>' + Math.floor(d.getTime() / 1000) +
        '</td><td>' + d.toISOString() + '</td><td>' + escapeHtml(d.toLocaleString()) + '</td></tr>';
    }).join('');
    batchWrap.classList.remove('d-none');
  }

  function copyBatch() {
    var rows = [['Input', 'Unix (s)', 'ISO 8601 (UTC)', 'Local time'].join('\t')];
    batch.value.split('\n').map(function (l) { return l.trim(); }).filter(Boolean).forEach(function (line) {
      var d = parseInput(line);
      rows.push([line, d ? Math.floor(d.getTime() / 1000) : '', d ? d.toISOString() : '', d ? d.toLocaleString() : ''].join('\t'));
    });
    copyToClipboard(rows.join('\n'), document.getElementById('btn-batch-copy'));
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t.classList && t.classList.contains('kv-copy')) copyToClipboard(t.getAttribute('data-copy'), t);
  });

  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') convert(); });
  document.getElementById('btn-convert').addEventListener('click', convert);
  document.getElementById('btn-now').addEventListener('click', setNow);
  document.getElementById('btn-share').addEventListener('click', share);
  document.getElementById('btn-clear').addEventListener('click', clearAll);
  document.getElementById('btn-batch').addEventListener('click', runBatch);
  document.getElementById('btn-batch-copy').addEventListener('click', copyBatch);
  tzSelect.addEventListener('change', function () { if (lastDate) renderTz(lastDate); });

  // Restore from share link, else seed with current time.
  var m = location.hash.match(/t=([^&]+)/);
  if (m) { input.value = decodeURIComponent(m[1]); convert(); }
  else { setNow(); }
})();
