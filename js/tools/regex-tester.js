(function() {
  'use strict';
  var patternEl = document.getElementById('pattern');
  var flagsEl = document.getElementById('flags');
  var testStringEl = document.getElementById('testString');
  var statusEl = document.getElementById('status');
  var highlightedEl = document.getElementById('highlighted');
  var matchDetailsEl = document.getElementById('matchDetails');
  var matchesDiv = document.getElementById('matches');
  var replaceToggle = document.getElementById('replaceToggle');
  var replaceSection = document.getElementById('replaceSection');
  var replacementEl = document.getElementById('replacement');
  var replaceOutputEl = document.getElementById('replaceOutput');
  var explainerEl = document.getElementById('explainer');

  // --- Pattern explainer: token-by-token breakdown of JS regex syntax ---
  function explainRegex(pattern) {
    var tokens = [];
    var i = 0;
    var depth = 0;
    var n = pattern.length;

    function push(src, label, unrec) {
      tokens.push({ src: src, label: label, depth: depth, unrec: !!unrec });
    }

    function tryQuantifier() {
      if (i >= n) return;
      var c = pattern[i];
      if (c === '*' || c === '+' || c === '?') {
        i++;
        var lazy = false;
        if (i < n && pattern[i] === '?') { lazy = true; i++; }
        var labels = { '*': '0 or more', '+': '1 or more', '?': '0 or 1' };
        push(c + (lazy ? '?' : ''), 'quantifier: ' + labels[c] + (lazy ? ' (lazy)' : '') + ' of the previous token');
      } else if (c === '{') {
        var rest = pattern.substring(i);
        var m = rest.match(/^\{(\d+)(,(\d*))?\}/);
        if (m) {
          i += m[0].length;
          var lazy2 = false;
          if (i < n && pattern[i] === '?') { lazy2 = true; i++; }
          var lab;
          if (m[2] === undefined) lab = 'exactly ' + m[1] + ' times';
          else if (m[3] === '' || m[3] === undefined) lab = m[1] + ' or more times';
          else lab = 'between ' + m[1] + ' and ' + m[3] + ' times';
          push(m[0] + (lazy2 ? '?' : ''), 'quantifier: ' + lab + (lazy2 ? ' (lazy)' : '') + ' of the previous token');
        }
      }
    }

    function readEscape() {
      if (i >= n) { push('\\', 'unrecognized token', true); return; }
      var c = pattern[i];
      i++;
      if (c === 'd') return push('\\d', 'any digit (0-9)');
      if (c === 'D') return push('\\D', 'any non-digit');
      if (c === 'w') return push('\\w', 'any word character (letter, digit, _)');
      if (c === 'W') return push('\\W', 'any non-word character');
      if (c === 's') return push('\\s', 'any whitespace character');
      if (c === 'S') return push('\\S', 'any non-whitespace character');
      if (c === 'b') return push('\\b', 'word boundary');
      if (c === 'B') return push('\\B', 'non-word boundary');
      if (c === 'n') return push('\\n', 'newline (LF)');
      if (c === 't') return push('\\t', 'tab');
      if (c === 'r') return push('\\r', 'carriage return');
      if (c === 'f') return push('\\f', 'form feed');
      if (c === 'v') return push('\\v', 'vertical tab');
      if (c === '0') return push('\\0', 'null character');
      if (c >= '1' && c <= '9') {
        var num = c;
        while (i < n && pattern[i] >= '0' && pattern[i] <= '9') { num += pattern[i]; i++; }
        return push('\\' + num, 'backreference to group ' + num);
      }
      if (c === 'k' && pattern[i] === '<') {
        var j = i + 1;
        while (j < n && pattern[j] !== '>') j++;
        if (j < n && pattern[j] === '>') {
          var name = pattern.substring(i + 1, j);
          i = j + 1;
          return push('\\k<' + name + '>', 'named backreference to "' + name + '"');
        }
      }
      if (c === 'x') {
        if (i + 1 < n && /[0-9a-fA-F]/.test(pattern[i]) && /[0-9a-fA-F]/.test(pattern[i + 1])) {
          var hx = pattern[i] + pattern[i + 1];
          i += 2;
          return push('\\x' + hx, 'hex escape: character 0x' + hx);
        }
      }
      if (c === 'u') {
        if (pattern[i] === '{') {
          var jj = i + 1;
          while (jj < n && pattern[jj] !== '}') jj++;
          if (jj < n && pattern[jj] === '}') {
            var cp = pattern.substring(i + 1, jj);
            i = jj + 1;
            return push('\\u{' + cp + '}', 'unicode code point U+' + cp);
          }
        } else if (/^[0-9a-fA-F]{4}$/.test(pattern.substring(i, i + 4))) {
          var hu = pattern.substring(i, i + 4);
          i += 4;
          return push('\\u' + hu, 'unicode escape: U+' + hu);
        }
      }
      if (c === 'c') {
        if (i < n && /[A-Za-z]/.test(pattern[i])) {
          var cc = pattern[i];
          i++;
          return push('\\c' + cc, 'control character: Ctrl+' + cc.toUpperCase());
        }
      }
      if (/[.^$*+?()[\]{}|\\\/\-]/.test(c)) return push('\\' + c, 'literal "' + c + '"');
      return push('\\' + c, 'escaped "' + c + '"');
    }

    function readCharClass() {
      var s = '[';
      i++;
      var negated = false;
      if (pattern[i] === '^') { negated = true; s += '^'; i++; }
      while (i < n && pattern[i] !== ']') {
        if (pattern[i] === '\\' && i + 1 < n) {
          s += pattern[i] + pattern[i + 1];
          i += 2;
        } else {
          s += pattern[i];
          i++;
        }
      }
      if (i < n && pattern[i] === ']') { s += ']'; i++; }
      var inner = s.slice(negated ? 2 : 1, -1);
      var label = (negated ? 'character class: any character NOT in ' : 'character class: any character in ') + (inner.length > 0 ? inner : '(empty set)');
      push(s, label);
    }

    while (i < n) {
      var c = pattern[i];
      if (c === '\\') {
        i++;
        readEscape();
        tryQuantifier();
      } else if (c === '[') {
        readCharClass();
        tryQuantifier();
      } else if (c === '(') {
        i++;
        if (pattern[i] === '?') {
          var next = pattern[i + 1];
          if (next === ':') { i += 2; push('(?:', 'non-capturing group'); depth++; }
          else if (next === '=') { i += 2; push('(?=', 'positive lookahead — followed by'); depth++; }
          else if (next === '!') { i += 2; push('(?!', 'negative lookahead — NOT followed by'); depth++; }
          else if (next === '<' && pattern[i + 2] === '=') { i += 3; push('(?<=', 'positive lookbehind — preceded by'); depth++; }
          else if (next === '<' && pattern[i + 2] === '!') { i += 3; push('(?<!', 'negative lookbehind — NOT preceded by'); depth++; }
          else if (next === '<') {
            var j2 = i + 2;
            while (j2 < n && pattern[j2] !== '>') j2++;
            if (j2 < n && pattern[j2] === '>') {
              var gname = pattern.substring(i + 2, j2);
              i = j2 + 1;
              push('(?<' + gname + '>', 'named capturing group: "' + gname + '"');
              depth++;
            } else {
              push('(', 'unrecognized token', true);
            }
          } else {
            push('(?', 'unrecognized token', true);
            i++;
          }
        } else {
          push('(', 'capturing group');
          depth++;
        }
      } else if (c === ')') {
        i++;
        depth = Math.max(0, depth - 1);
        push(')', 'end of group');
        tryQuantifier();
      } else if (c === '|') {
        i++;
        push('|', 'OR — alternation between left and right');
      } else if (c === '^') {
        i++;
        push('^', 'start of string (or line with m flag)');
      } else if (c === '$') {
        i++;
        push('$', 'end of string (or line with m flag)');
      } else if (c === '.') {
        i++;
        push('.', 'any character (except newline, unless s flag)');
        tryQuantifier();
      } else if (c === '*' || c === '+' || c === '?' || c === '{') {
        push(c, 'unrecognized token', true);
        i++;
      } else {
        i++;
        push(c, 'literal "' + c + '"');
        tryQuantifier();
      }
    }

    return tokens;
  }

  function renderExplainer(tokens) {
    if (!tokens.length) {
      return '<div class="regex-explainer-empty">Type a regex pattern above to see a token-by-token breakdown.</div>';
    }
    var html = '<div class="regex-explainer">';
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      var d = Math.min(t.depth, 6);
      var cls = 'regex-explainer-row depth-' + d + (t.unrec ? ' unrecognized' : '');
      var label = t.unrec ? 'unrecognized token' : t.label;
      html += '<div class="' + cls + '"><code class="regex-explainer-code">' + escapeHtml(t.src) + '</code><span class="regex-explainer-label">' + escapeHtml(label) + '</span></div>';
    }
    html += '</div>';
    return html;
  }

  var explainerTimer = null;
  function updateExplainerDebounced() {
    clearTimeout(explainerTimer);
    explainerTimer = setTimeout(updateExplainer, 150);
  }
  function updateExplainer() {
    try {
      explainerEl.innerHTML = renderExplainer(explainRegex(patternEl.value));
    } catch (e) {
      explainerEl.innerHTML = '<div class="regex-explainer-empty">Pattern could not be analyzed.</div>';
    }
  }

  // --- URL hash sharing: decode on load ---
  function decodeHashParam(s) { try { return decodeURIComponent(atob(s)); } catch(e) { return ''; } }
  function encodeHashParam(s) { return btoa(encodeURIComponent(s)); }
  (function loadFromHash() {
    var h = window.location.hash.substring(1);
    if (!h) return;
    var params = {};
    h.split('&').forEach(function(pair) { var kv = pair.split('='); if (kv.length === 2) params[kv[0]] = kv[1]; });
    if (params.p) patternEl.value = decodeHashParam(params.p);
    if (params.f !== undefined) flagsEl.value = decodeHashParam(params.f);
    if (params.t) testStringEl.value = decodeHashParam(params.t);
    if (params.r) {
      replacementEl.value = decodeHashParam(params.r);
      replaceToggle.checked = true;
      replaceSection.classList.remove('d-none');
    }
  })();

  // Share button
  document.getElementById('btn-share').addEventListener('click', function() {
    var hash = '#p=' + encodeHashParam(patternEl.value) + '&f=' + encodeHashParam(flagsEl.value) + '&t=' + encodeHashParam(testStringEl.value);
    if (replaceToggle.checked && replacementEl.value) {
      hash += '&r=' + encodeHashParam(replacementEl.value);
    }
    var url = window.location.origin + window.location.pathname + hash;
    navigator.clipboard.writeText(url).then(function() { showToast('Link copied!'); });
  });

  // Replace mode toggle
  replaceToggle.addEventListener('change', function() {
    replaceSection.classList.toggle('d-none', !this.checked);
    if (this.checked) updateReplace();
  });

  function updateReplace() {
    if (!replaceToggle.checked) return;
    var pattern = patternEl.value;
    var flags = flagsEl.value;
    var testStr = testStringEl.value;
    var replacement = replacementEl.value;
    if (!pattern) { replaceOutputEl.textContent = testStr; return; }
    try {
      var regex = new RegExp(pattern, flags);
      replaceOutputEl.textContent = testStr.replace(regex, replacement);
    } catch (e) {
      replaceOutputEl.textContent = '';
    }
  }

  function testRegex() {
    var pattern = patternEl.value;
    var flags = flagsEl.value;
    var testStr = testStringEl.value;

    if (!pattern) {
      highlightedEl.textContent = testStr;
      matchDetailsEl.classList.add('d-none');
      statusEl.innerHTML = '';
      updateReplace();
      return;
    }

    try {
      var regex = new RegExp(pattern, flags);
      var matchCount = 0;
      var allMatches = [];

      if (flags.indexOf('g') !== -1) {
        var m;
        while ((m = regex.exec(testStr)) !== null) {
          allMatches.push({ match: m[0], index: m.index, groups: Array.prototype.slice.call(m, 1), namedGroups: m.groups || null });
          matchCount++;
          if (matchCount > 1000) break;
        }
      } else {
        var m = regex.exec(testStr);
        if (m) {
          allMatches.push({ match: m[0], index: m.index, groups: Array.prototype.slice.call(m, 1), namedGroups: m.groups || null });
          matchCount = 1;
        }
      }

      if (allMatches.length > 0) {
        var html = '';
        var lastIndex = 0;
        for (var i = 0; i < allMatches.length; i++) {
          html += escapeHtml(testStr.substring(lastIndex, allMatches[i].index));
          html += '<mark class="match-highlight">' + escapeHtml(allMatches[i].match) + '</mark>';
          lastIndex = allMatches[i].index + allMatches[i].match.length;
        }
        html += escapeHtml(testStr.substring(lastIndex));
        highlightedEl.innerHTML = html;
      } else {
        highlightedEl.textContent = testStr;
      }

      if (allMatches.length > 0) {
        matchDetailsEl.classList.remove('d-none');
        matchesDiv.innerHTML = allMatches.map(function(m, i) {
          var groupsStr = m.groups.length ? ' — Groups: ' + m.groups.map(function(g, j) { return '<code>$' + (j+1) + '=' + escapeHtml(g || '') + '</code>'; }).join(', ') : '';
          if (m.namedGroups) {
            var namedParts = Object.keys(m.namedGroups).map(function(k) { return '<code>' + escapeHtml(k) + '=' + escapeHtml(m.namedGroups[k] || '') + '</code>'; });
            groupsStr += ' — Named: ' + namedParts.join(', ');
          }
          return '<div class="match-item"><span class="match-num">#' + (i+1) + '</span> <code>' + escapeHtml(m.match) + '</code> <span class="text-muted">at index ' + m.index + '</span>' + groupsStr + '</div>';
        }).join('');
      } else {
        matchDetailsEl.classList.add('d-none');
      }

      statusEl.innerHTML = '<span class="valid">' + matchCount + ' match' + (matchCount !== 1 ? 'es' : '') + ' found</span>';
    } catch (e) {
      statusEl.innerHTML = '<span class="invalid">Error: ' + escapeHtml(e.message) + '</span>';
      highlightedEl.textContent = testStr;
      matchDetailsEl.classList.add('d-none');
    }

    updateReplace();
  }

  patternEl.addEventListener('input', testRegex);
  patternEl.addEventListener('input', updateExplainerDebounced);
  flagsEl.addEventListener('input', testRegex);
  testStringEl.addEventListener('input', testRegex);
  replacementEl.addEventListener('input', updateReplace);

  testRegex();
  updateExplainer();
})();
