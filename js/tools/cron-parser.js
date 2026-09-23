(function () {
  'use strict';
  var input = document.getElementById('input');
  var status = document.getElementById('status');
  var resultCard = document.getElementById('result-card');
  var descEl = document.getElementById('desc');
  var runsBody = document.getElementById('runs-body');
  var runTz = document.getElementById('run-tz');

  var MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var MONTH_ABBR = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };
  var DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var DOW_ABBR = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };
  var MACROS = {
    '@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *', '@monthly': '0 0 1 * *',
    '@weekly': '0 0 * * 0', '@daily': '0 0 * * *', '@midnight': '0 0 * * *', '@hourly': '0 * * * *'
  };

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  // Expand one field into a sorted array of integers, or throw on bad syntax.
  function expand(field, min, max, names) {
    var out = {};
    field.split(',').forEach(function (part) {
      var step = 1, range = part;
      var slash = part.split('/');
      if (slash.length === 2) { range = slash[0]; step = parseInt(slash[1], 10); if (!(step > 0)) throw 'bad step "' + part + '"'; }
      else if (slash.length > 2) throw 'bad step "' + part + '"';
      var lo, hi;
      if (range === '*') { lo = min; hi = max; }
      else {
        var rb = range.split('-');
        if (rb.length === 1) { lo = hi = nameToNum(rb[0], names, min, max); if (step !== 1) hi = max; }
        else if (rb.length === 2) { lo = nameToNum(rb[0], names, min, max); hi = nameToNum(rb[1], names, min, max); }
        else throw 'bad range "' + part + '"';
      }
      if (lo < min || hi > max || lo > hi) throw 'out of range "' + part + '"';
      for (var v = lo; v <= hi; v += step) out[v] = true;
    });
    return Object.keys(out).map(Number).sort(function (a, b) { return a - b; });
  }

  function nameToNum(token, names, min, max) {
    if (/^\d+$/.test(token)) return parseInt(token, 10);
    if (names && names[token.toUpperCase()] != null) return names[token.toUpperCase()];
    throw 'unknown value "' + token + '"';
  }

  function parse(expr) {
    expr = expr.trim();
    if (MACROS[expr.toLowerCase()]) expr = MACROS[expr.toLowerCase()];
    var f = expr.split(/\s+/);
    if (f.length !== 5) throw 'Expected 5 fields, got ' + f.length + '. Use: minute hour day-of-month month day-of-week.';
    var dowRaw = f[4].replace(/7/g, '0');
    return {
      minute: expand(f[0], 0, 59, null),
      hour: expand(f[1], 0, 23, null),
      dom: expand(f[2], 1, 31, null),
      month: expand(f[3], 1, 12, MONTH_ABBR),
      dow: expand(dowRaw, 0, 6, DOW_ABBR),
      raw: { minute: f[0], hour: f[1], dom: f[2], month: f[3], dow: f[4] }
    };
  }

  function matches(date, c) {
    if (c.minute.indexOf(date.getMinutes()) === -1) return false;
    if (c.hour.indexOf(date.getHours()) === -1) return false;
    if (c.month.indexOf(date.getMonth() + 1) === -1) return false;
    var domR = c.raw.dom !== '*', dowR = c.raw.dow !== '*';
    var domMatch = c.dom.indexOf(date.getDate()) !== -1;
    var dowMatch = c.dow.indexOf(date.getDay()) !== -1;
    if (domR && dowR) return domMatch || dowMatch;
    if (domR) return domMatch;
    if (dowR) return dowMatch;
    return true;
  }

  function nextRuns(c, count) {
    var runs = [];
    var d = new Date();
    d.setSeconds(0, 0);
    d.setMinutes(d.getMinutes() + 1);
    var cap = 366 * 24 * 60 * 5; // safety bound (~5 years of minutes)
    for (var i = 0; i < cap && runs.length < count; i++) {
      if (matches(d, c)) runs.push(new Date(d.getTime()));
      d.setMinutes(d.getMinutes() + 1);
    }
    return runs;
  }

  // ---- Human description ----
  function listNames(raw, names) {
    return raw.split(',').map(function (part) {
      if (part.indexOf('/') !== -1) {
        var sp = part.split('/');
        return 'every ' + sp[1] + (sp[0] === '*' ? '' : ' from ' + names(sp[0]));
      }
      if (part.indexOf('-') !== -1) {
        var rb = part.split('-');
        return names(rb[0]) + ' through ' + names(rb[1]);
      }
      return names(part);
    }).join(', ');
  }

  function describeTime(raw) {
    var m = raw.minute, h = raw.hour;
    if (m === '*' && h === '*') return 'Every minute';
    if (/^\*\/\d+$/.test(m) && h === '*') return 'Every ' + m.split('/')[1] + ' minutes';
    if (m === '0' && /^\*\/\d+$/.test(h)) return 'Every ' + h.split('/')[1] + ' hours, on the hour';
    if (m === '0' && h === '*') return 'Every hour, on the hour';
    if (/^\d+$/.test(m) && h === '*') return 'At minute ' + m + ' of every hour';
    if (/^\d+$/.test(m) && /^\d+$/.test(h)) return 'At ' + pad(+h) + ':' + pad(+m);
    if (/^\*\/\d+$/.test(m) && /^[\d,\-]+$/.test(h)) return 'Every ' + m.split('/')[1] + ' minutes, during hours ' + h;
    return 'At minute ' + m + ', hour ' + h;
  }

  function describe(raw) {
    var s = describeTime(raw);
    var monthName = function (n) { return MONTHS[+n] || n; };
    var dowName = function (n) { var x = n === '7' ? '0' : n; return DOW[+x] != null ? DOW[+x] : n; };
    if (raw.dom !== '*' && raw.dow !== '*') {
      s += ', on day-of-month ' + listNames(raw.dom, function (x) { return x; }) + ' and on ' + listNames(raw.dow, dowName);
    } else if (raw.dom !== '*') {
      s += ', on day-of-month ' + listNames(raw.dom, function (x) { return x; });
    } else if (raw.dow !== '*') {
      s += ', on ' + listNames(raw.dow, dowName);
    }
    if (raw.month !== '*') s += ', in ' + listNames(raw.month, monthName);
    return s + '.';
  }

  function run() {
    var c;
    try { c = parse(input.value); }
    catch (err) {
      resultCard.classList.add('d-none');
      status.innerHTML = '';
      var errSpan = document.createElement('span');
      errSpan.className = 'invalid';
      errSpan.textContent = 'Invalid: ' + String(err);
      status.appendChild(errSpan);
      return;
    }
    status.innerHTML = '<span class="valid">Valid cron expression.</span>';
    descEl.textContent = describe(c.raw);
    var runs = nextRuns(c, 5);
    runTz = document.getElementById('run-tz');
    try { runTz.textContent = '· ' + Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) {}
    if (!runs.length) {
      runsBody.innerHTML = '<tr><td colspan="4" class="cell-error">No run found within the next 5 years.</td></tr>';
    } else {
      var now = Date.now();
      runsBody.innerHTML = '';
      runs.forEach(function (d, i) {
        var mins = Math.round((d.getTime() - now) / 60000);
        var inStr = mins < 60 ? mins + ' min' : (mins < 1440 ? Math.round(mins / 60) + ' h' : Math.round(mins / 1440) + ' d');
        var tr = document.createElement('tr');
        [i + 1, d.toLocaleString(), d.toISOString(), inStr].forEach(function (v) {
          var td = document.createElement('td');
          td.textContent = v;
          tr.appendChild(td);
        });
        runsBody.appendChild(tr);
      });
    }
    resultCard.classList.remove('d-none');
  }

  document.getElementById('examples').addEventListener('click', function (e) {
    if (e.target.classList.contains('ex-btn')) { input.value = e.target.getAttribute('data-cron'); run(); }
  });
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });
  document.getElementById('btn-parse').addEventListener('click', run);
  document.getElementById('btn-clear').addEventListener('click', function () {
    input.value = ''; resultCard.classList.add('d-none'); status.innerHTML = ''; input.focus();
  });

  run();
})();
