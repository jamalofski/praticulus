(function () {
  'use strict';
  var input = document.getElementById('input');
  var status = document.getElementById('status');
  var resultCard = document.getElementById('result-card');
  var stats = document.getElementById('stats');
  var thead = document.getElementById('thead');
  var tbody = document.getElementById('tbody');
  var hasHeader = document.getElementById('has-header');
  var delimSel = document.getElementById('delim');
  var dropZone = document.getElementById('drop-zone');
  var fileInput = document.getElementById('file-input');

  var rows = [];        // parsed rows (array of arrays)
  var headers = [];     // header labels
  var sortState = { col: -1, dir: 1 };

  function detectDelimiter(text) {
    var line = text.split(/\r?\n/).filter(function (l) { return l.trim(); })[0] || '';
    var cands = [',', ';', '\t', '|'];
    var best = ',', bestCount = -1;
    cands.forEach(function (d) {
      var n = line.split(d).length - 1;
      if (n > bestCount) { bestCount = n; best = d; }
    });
    return best;
  }

  // RFC-4180-ish parser: handles quotes, "" escapes, delimiters and newlines inside quotes.
  function parseCSV(text, delim) {
    var out = [], row = [], field = '', i = 0, inQuotes = false;
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    while (i < text.length) {
      var ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        }
        field += ch; i++; continue;
      }
      if (ch === '"') { inQuotes = true; i++; continue; }
      if (ch === delim) { row.push(field); field = ''; i++; continue; }
      if (ch === '\n') { row.push(field); out.push(row); row = []; field = ''; i++; continue; }
      field += ch; i++;
    }
    row.push(field); out.push(row);
    // Drop a trailing empty line.
    if (out.length && out[out.length - 1].length === 1 && out[out.length - 1][0] === '') out.pop();
    return out;
  }

  function render() {
    var th = '<tr>';
    headers.forEach(function (h, idx) {
      var cls = 'sortable' + (sortState.col === idx ? (sortState.dir === 1 ? ' sort-asc' : ' sort-desc') : '');
      th += '<th class="' + cls + '" data-col="' + idx + '">' + escapeHtml(h) + '</th>';
    });
    th += '</tr>';
    thead.innerHTML = th;

    var body = rows.map(function (r) {
      var cells = '';
      for (var c = 0; c < headers.length; c++) cells += '<td>' + escapeHtml(r[c] != null ? r[c] : '') + '</td>';
      return '<tr>' + cells + '</tr>';
    }).join('');
    tbody.innerHTML = body;
  }

  function process() {
    var text = input.value;
    if (!text.trim()) { status.innerHTML = '<span class="invalid">Nothing to parse.</span>'; resultCard.classList.add('d-none'); return; }
    var delim = delimSel.value === 'auto' ? detectDelimiter(text) : delimSel.value;
    var grid = parseCSV(text, delim);
    if (!grid.length) { resultCard.classList.add('d-none'); return; }
    if (hasHeader.checked) {
      headers = grid[0];
      rows = grid.slice(1);
    } else {
      var cols = grid.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
      headers = []; for (var c = 0; c < cols; c++) headers.push('Column ' + (c + 1));
      rows = grid;
    }
    sortState = { col: -1, dir: 1 };
    var delimName = delim === '\t' ? 'tab' : delim;
    stats.innerHTML = '<span class="stat"><b>' + rows.length + '</b> rows</span>' +
      '<span class="stat"><b>' + headers.length + '</b> columns</span>' +
      '<span class="stat">delimiter <code>' + escapeHtml(delimName) + '</code></span>';
    render();
    resultCard.classList.remove('d-none');
    status.innerHTML = '<span class="valid">Parsed ' + rows.length + ' rows.</span>';
  }

  function sortBy(col) {
    if (sortState.col === col) sortState.dir *= -1;
    else { sortState.col = col; sortState.dir = 1; }
    var dir = sortState.dir;
    rows.sort(function (a, b) {
      var x = a[col] != null ? a[col] : '', y = b[col] != null ? b[col] : '';
      var nx = parseFloat(x), ny = parseFloat(y);
      if (!isNaN(nx) && !isNaN(ny) && /^\s*-?[\d.,]+\s*$/.test(x) && /^\s*-?[\d.,]+\s*$/.test(y)) return (nx - ny) * dir;
      return x.localeCompare(y) * dir;
    });
    render();
  }

  function toJSON() {
    if (hasHeader.checked) {
      return JSON.stringify(rows.map(function (r) {
        var o = {}; headers.forEach(function (h, i) { o[h] = r[i] != null ? r[i] : ''; }); return o;
      }), null, 2);
    }
    return JSON.stringify(rows, null, 2);
  }

  function toTSV() {
    return [headers].concat(rows).map(function (r) { return r.join('\t'); }).join('\n');
  }

  function handleFile(file) {
    var reader = new FileReader();
    reader.onload = function (e) { input.value = e.target.result; process(); };
    reader.readAsText(file);
  }

  thead.addEventListener('click', function (e) {
    var th = e.target.closest('th');
    if (th && th.hasAttribute('data-col')) sortBy(parseInt(th.getAttribute('data-col'), 10));
  });
  dropZone.addEventListener('click', function () { fileInput.click(); });
  fileInput.addEventListener('change', function () { if (fileInput.files[0]) handleFile(fileInput.files[0]); });
  dropZone.addEventListener('dragover', function (e) { e.preventDefault(); dropZone.classList.add('drop-zone-active'); });
  dropZone.addEventListener('dragleave', function () { dropZone.classList.remove('drop-zone-active'); });
  dropZone.addEventListener('drop', function (e) {
    e.preventDefault(); dropZone.classList.remove('drop-zone-active');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  document.getElementById('btn-parse').addEventListener('click', process);
  document.getElementById('btn-clear').addEventListener('click', function () {
    input.value = ''; resultCard.classList.add('d-none'); status.innerHTML = ''; input.focus();
  });
  document.getElementById('btn-json').addEventListener('click', function () { copyToClipboard(toJSON(), this); });
  document.getElementById('btn-json-dl').addEventListener('click', function () { downloadText(toJSON(), 'data.json'); });
  document.getElementById('btn-tsv').addEventListener('click', function () { copyToClipboard(toTSV(), this); });
})();
