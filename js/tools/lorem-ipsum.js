(function() {
  'use strict';

  /* All sentences from Cicero paragraphs */
  var ALL_SENTENCES = [];
  var ALL_WORDS = [];
  CICERO.forEach(function(p) {
    p.split(/(?<=[.?!])\s+/).forEach(function(s) { if (s.trim()) ALL_SENTENCES.push(s.trim()); });
    p.split(/\s+/).forEach(function(w) { if (w) ALL_WORDS.push(w.toLowerCase().replace(/[^a-z]/g, '')); });
  });

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  var shuffledParagraphs = shuffle(CICERO);
  var shuffledSentences = shuffle(ALL_SENTENCES);
  var shuffledWords = shuffle(ALL_WORDS);

  function reshuffle() {
    shuffledParagraphs = shuffle(CICERO);
    shuffledSentences = shuffle(ALL_SENTENCES);
    shuffledWords = shuffle(ALL_WORDS);
  }

  function generate() {
    var count = Math.min(parseInt($('#count').value) || 3, 100);
    var unit = $('#unit').value;
    var startClassic = $('#start-lorem').checked;
    var htmlWrap = $('#html-wrap').checked;
    var parts = [];
    var i;

    if (unit === 'paragraphs') {
      if (startClassic) parts.push(CICERO[0]);
      var pool = shuffledParagraphs.filter(function(p) { return !startClassic || p !== CICERO[0]; });
      for (i = startClassic ? 1 : 0; i < count; i++) parts.push(pool[i % pool.length]);
      if (htmlWrap) {
        result = parts.map(function(p) { return '<p>' + p + '</p>'; }).join('\n');
      } else {
        result = parts.join('\n\n');
      }
    } else if (unit === 'sentences') {
      if (startClassic) parts.push(ALL_SENTENCES[0]);
      var sPool = shuffledSentences.filter(function(s) { return !startClassic || s !== ALL_SENTENCES[0]; });
      for (i = startClassic ? 1 : 0; i < count; i++) parts.push(sPool[i % sPool.length]);
      if (htmlWrap) {
        result = '<p>' + parts.join(' ') + '</p>';
      } else {
        result = parts.join(' ');
      }
    } else if (unit === 'list') {
      var listSentences = shuffledSentences.slice();
      if (startClassic) { listSentences.unshift(ALL_SENTENCES[0]); }
      for (i = 0; i < count; i++) {
        var s = listSentences[i % listSentences.length];
        var words = s.split(/\s+/).slice(0, 4 + Math.floor(Math.random() * 5));
        var item = words.join(' ').replace(/[.?!,]$/, '');
        item = item.charAt(0).toUpperCase() + item.slice(1);
        parts.push(item);
      }
      if (htmlWrap) {
        result = '<ul>\n' + parts.map(function(li) { return '  <li>' + li + '</li>'; }).join('\n') + '\n</ul>';
      } else {
        result = parts.map(function(li) { return '\u2022 ' + li; }).join('\n');
      }
    } else {
      if (startClassic) {
        var classicStart = ALL_WORDS.slice(0, Math.min(count, ALL_WORDS.length));
        parts = classicStart;
      }
      var wPool = shuffledWords;
      for (i = parts.length; i < count; i++) parts.push(wPool[i % wPool.length]);
      result = parts.join(' ');
    }

    var result = result || '';
    $('#output').textContent = result;
    var wc = result.split(/\s+/).filter(Boolean).length;
    var bytes = new Blob([result]).size;
    $('#status').innerHTML = '<span class="valid">' + wc + ' words, ' + result.length + ' chars, ' + bytes + ' bytes</span>';
  }

  $('#btn-generate').addEventListener('click', function() { reshuffle(); generate(); });
  $('#count').addEventListener('input', generate);
  $('#unit').addEventListener('change', generate);
  $('#start-lorem').addEventListener('change', generate);
  $('#html-wrap').addEventListener('change', generate);
  $('#btn-copy').addEventListener('click', function() { navigator.clipboard.writeText($('#output').textContent); });
  $('#btn-download').addEventListener('click', function() { downloadText($('#output').textContent, 'lorem-ipsum.txt'); });

  generate();
})();
