(function() {
  'use strict';
  var input = document.getElementById('input');
  var topwords = document.getElementById('topwords');
  var topwordsEmpty = document.getElementById('topwords-empty');
  var seg = (window.Intl && Intl.Segmenter) ? new Intl.Segmenter(undefined, { granularity: 'word' }) : null;

  var STOP = {};
  ('the a an and or but of to in on at for with as by is are was were be been it its this that these those i you he she we they from not no so if then than too very can will just into over out about your their our his her my me us them do does did has have had what which who'
    ).split(' ').forEach(function (w) { STOP[w] = 1; });

  function wordList(t) {
    if (seg) {
      var out = [];
      var it = seg.segment(t);
      for (var s of it) { if (s.isWordLike) out.push(s.segment.toLowerCase()); }
      return out;
    }
    var m = t.toLowerCase().match(/[\p{L}\p{N}']+/gu);
    return m || [];
  }

  function fmtTime(words) {
    var secs = Math.round(words / 238 * 60);
    if (secs < 1) return '0s';
    if (secs < 60) return secs + 's';
    var m = Math.floor(secs / 60), s = secs % 60;
    return s ? m + 'm ' + s + 's' : m + 'm';
  }

  function update() {
    var t = input.value;
    var chars = Array.from(t).length;
    var charsNs = Array.from(t.replace(/\s/g, '')).length;
    var words = wordList(t);
    var wcount = words.length;
    var sentences = (t.match(/[^.!?…]+[.!?…]+(?:["')\]]+)?/g) || []).filter(function (s) { return s.trim(); }).length;
    var paragraphs = t.split(/\n\s*\n/).filter(function (p) { return p.trim(); }).length;

    document.getElementById('s-words').textContent = wcount.toLocaleString('en-US');
    document.getElementById('s-chars').textContent = chars.toLocaleString('en-US');
    document.getElementById('s-chars-ns').textContent = charsNs.toLocaleString('en-US');
    document.getElementById('s-sent').textContent = sentences.toLocaleString('en-US');
    document.getElementById('s-para').textContent = paragraphs.toLocaleString('en-US');
    document.getElementById('s-read').textContent = fmtTime(wcount);

    var freq = {};
    words.forEach(function (w) { if (w.length > 1 && !STOP[w]) freq[w] = (freq[w] || 0) + 1; });
    var top = Object.keys(freq).map(function (w) { return [w, freq[w]]; })
      .sort(function (a, b) { return b[1] - a[1] || (a[0] < b[0] ? -1 : 1); })
      .slice(0, 10);

    if (top.length) {
      topwordsEmpty.classList.add('d-none');
      topwords.classList.remove('d-none');
      topwords.innerHTML = top.map(function (e) {
        return '<div class="kv-row"><span class="kv-label">' + escapeHtml(e[0]) + '</span>' +
               '<span class="kv-value">' + e[1] + '</span></div>';
      }).join('');
    } else {
      topwords.classList.add('d-none');
      topwordsEmpty.classList.remove('d-none');
    }
  }

  document.getElementById('btn-clear').addEventListener('click', function () { input.value = ''; input.focus(); update(); });
  input.addEventListener('input', update);
  update();
})();
