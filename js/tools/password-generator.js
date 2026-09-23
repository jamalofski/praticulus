(function() {
  'use strict';
  var UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var LOWER = 'abcdefghijklmnopqrstuvwxyz';
  var DIGITS = '0123456789';
  var SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  var AMBIGUOUS = '0OlI1';
  var separator = '-';

  function getCharset() {
    var cs = '';
    if ($('#upper').checked) cs += UPPER;
    if ($('#lower').checked) cs += LOWER;
    if ($('#digits').checked) cs += DIGITS;
    if ($('#symbols').checked) cs += SYMBOLS;
    if ($('#exclude-ambiguous').checked) {
      cs = cs.split('').filter(function(c) { return AMBIGUOUS.indexOf(c) === -1; }).join('');
    }
    return cs || LOWER;
  }

  function genPassword(len) {
    var cs = getCharset();
    var arr = new Uint32Array(len);
    crypto.getRandomValues(arr);
    return Array.from(arr, function(v) { return cs[v % cs.length]; }).join('');
  }

  function genPassphrase(count) {
    var arr = new Uint32Array(count);
    crypto.getRandomValues(arr);
    return Array.from(arr, function(v) { return PASSPHRASE_WORDS[v % PASSPHRASE_WORDS.length]; }).join(separator);
  }

  function isPassphrase() { return $('#passphrase-mode').checked; }

  function generate() {
    var pwd;
    if (isPassphrase()) {
      pwd = genPassphrase(parseInt($('#word-count').value) || 4);
    } else {
      pwd = genPassword(parseInt($('#length').value));
    }
    $('#password').textContent = pwd;
    updateStrength(pwd);
    updateCrackTime(pwd);
  }

  function updateLen() { $('#len-display').textContent = $('#length').value; }
  function updateWordCount() { $('#word-count-display').textContent = $('#word-count').value; }

  function calcEntropy(pwd) {
    if (isPassphrase()) return pwd.split(separator).length * Math.log2(PASSPHRASE_WORDS.length);
    return pwd.length * Math.log2(getCharset().length);
  }

  function updateStrength(pwd) {
    var entropy = calcEntropy(pwd);
    var label, cls;
    if (entropy < 40) { label = 'Weak'; cls = 'invalid'; }
    else if (entropy < 60) { label = 'Fair'; cls = 'valid'; }
    else if (entropy < 80) { label = 'Strong'; cls = 'valid'; }
    else { label = 'Very Strong'; cls = 'valid'; }
    $('#strength').innerHTML = '<span class="' + cls + '">\u25cf ' + label + '</span> <span class="text-muted">(' + Math.floor(entropy) + ' bits)</span>';
  }

  function updateCrackTime(pwd) {
    var entropy = calcEntropy(pwd);
    var sec = Math.pow(2, entropy) / 1e9;
    var label;
    if (sec < 1) label = 'Instant';
    else if (sec < 60) label = Math.round(sec) + ' seconds';
    else if (sec < 3600) label = Math.round(sec / 60) + ' minutes';
    else if (sec < 86400) label = Math.round(sec / 3600) + ' hours';
    else if (sec < 31536000) label = Math.round(sec / 86400) + ' days';
    else if (sec < 31536000e3) label = Math.round(sec / 31536000) + ' years';
    else if (sec < 31536000e6) label = Math.round(sec / 31536000e3) + 'K years';
    else if (sec < 31536000e9) label = Math.round(sec / 31536000e6) + 'M years';
    else label = 'Billions of years';
    $('#crack-time').innerHTML = '<span class="text-muted">Crack time (1B/sec): </span><strong>' + label + '</strong>';
  }

  function copyPwd() {
    navigator.clipboard.writeText($('#password').textContent);
    $('#copy-status').innerHTML = '<span class="valid">Copied!</span>';
    setTimeout(function() { $('#copy-status').innerHTML = ''; }, 1500);
  }

  function generateBulk() {
    var count = Math.min(parseInt($('#bulk-count').value) || 5, 100);
    var pwds;
    if (isPassphrase()) {
      var wc = parseInt($('#word-count').value) || 4;
      pwds = Array.from({ length: count }, function() { return genPassphrase(wc); });
    } else {
      var len = parseInt($('#length').value);
      pwds = Array.from({ length: count }, function() { return genPassword(len); });
    }
    $('#bulk-output').value = pwds.join('\n');
  }

  function copyBulk() { navigator.clipboard.writeText($('#bulk-output').value); }

  $('#passphrase-mode').addEventListener('change', function() {
    $('#password-options').classList.toggle('d-none', this.checked);
    $('#passphrase-options').classList.toggle('d-none', !this.checked);
    generate();
  });

  document.querySelectorAll('.sep-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.sep-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      separator = btn.getAttribute('data-sep');
      $('#custom-sep').value = '';
      generate();
    });
  });
  $('#custom-sep').addEventListener('input', function() {
    if (this.value) { separator = this.value; document.querySelectorAll('.sep-btn').forEach(function(b) { b.classList.remove('active'); }); generate(); }
  });
  $('#word-count').addEventListener('input', function() { updateWordCount(); generate(); });

  document.getElementById('btn-generate').addEventListener('click', generate);
  document.getElementById('btn-copy').addEventListener('click', copyPwd);
  document.getElementById('password').addEventListener('click', copyPwd);
  document.getElementById('btn-bulk-generate').addEventListener('click', generateBulk);
  document.getElementById('btn-bulk-copy').addEventListener('click', copyBulk);
  document.getElementById('length').addEventListener('input', function() { updateLen(); generate(); });

  ['upper', 'lower', 'digits', 'symbols', 'exclude-ambiguous'].forEach(function(id) {
    document.getElementById(id).addEventListener('change', generate);
  });

  generate();
})();
