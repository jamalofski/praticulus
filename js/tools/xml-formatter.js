(function() {
  'use strict';
  var input = document.getElementById('input');
  var output = document.getElementById('output');
  var status = document.getElementById('status');
  var indentSel = document.getElementById('indent-select');
  var rawOutput = '';

  function getIndent() { return ' '.repeat(parseInt(indentSel.value, 10) || 2); }
  function isWS(s) { return !/\S/.test(s); }
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function escAttr(s) { return esc(s).replace(/"/g, '&quot;'); }
  function xmlDecl(str) { var m = str.match(/^\s*<\?xml[^>]*\?>/i); return m ? m[0].trim() : ''; }

  function parseXML(str) {
    var doc = new DOMParser().parseFromString(str, 'application/xml');
    var err = doc.querySelector('parsererror');
    if (err) {
      var txt = err.textContent.replace(/\s+/g, ' ').trim();
      var m = txt.match(/error on line \d+ at column \d+:.*?(?= Below is a rendering|$)/i);
      throw new Error(m ? m[0].trim() : txt);
    }
    return doc;
  }

  function attrs(el) {
    var s = '', a = el.attributes;
    for (var i = 0; i < a.length; i++) { s += ' ' + a[i].name + '="' + escAttr(a[i].value) + '"'; }
    return s;
  }

  function fmtChildren(node, indent, level) {
    var out = '', kids = node.childNodes;
    for (var i = 0; i < kids.length; i++) {
      var c = kids[i];
      switch (c.nodeType) {
        case 1: out += fmtElement(c, indent, level); break;
        case 3: if (!isWS(c.nodeValue)) out += indent.repeat(level) + esc(c.nodeValue.trim()) + '\n'; break;
        case 4: out += indent.repeat(level) + '<![CDATA[' + c.nodeValue + ']]>\n'; break;
        case 7: out += indent.repeat(level) + '<?' + c.target + ' ' + c.data + '?>\n'; break;
        case 8: out += indent.repeat(level) + '<!--' + c.nodeValue + '-->\n'; break;
      }
    }
    return out;
  }

  function fmtElement(el, indent, level) {
    var pad = indent.repeat(level);
    var open = '<' + el.nodeName + attrs(el);
    var kids = el.childNodes;
    if (kids.length === 0) return pad + open + '/>\n';
    var hasElem = false, hasText = false, i;
    for (i = 0; i < kids.length; i++) {
      if (kids[i].nodeType === 1) hasElem = true;
      else if (kids[i].nodeType === 3 && !isWS(kids[i].nodeValue)) hasText = true;
    }
    // Mixed content: keep verbatim so significant whitespace is not altered.
    if (hasElem && hasText) return pad + new XMLSerializer().serializeToString(el) + '\n';
    if (!hasElem) {
      var inner = '';
      for (i = 0; i < kids.length; i++) {
        var k = kids[i];
        if (k.nodeType === 3) inner += esc(k.nodeValue.trim());
        else if (k.nodeType === 4) inner += '<![CDATA[' + k.nodeValue + ']]>';
      }
      return pad + open + '>' + inner + '</' + el.nodeName + '>\n';
    }
    return pad + open + '>\n' + fmtChildren(el, indent, level + 1) + pad + '</' + el.nodeName + '>\n';
  }

  function formatDoc(str) {
    var doc = parseXML(str);
    var decl = xmlDecl(str);
    var body = fmtChildren(doc, getIndent(), 0).replace(/\n$/, '');
    return (decl ? decl + '\n' : '') + body;
  }

  function stripFmtWS(node) {
    var kids = node.childNodes, hasElem = false, i;
    for (i = 0; i < kids.length; i++) if (kids[i].nodeType === 1) hasElem = true;
    for (i = kids.length - 1; i >= 0; i--) {
      var c = kids[i];
      if (c.nodeType === 3 && hasElem && isWS(c.nodeValue)) node.removeChild(c);
      else if (c.nodeType === 1) stripFmtWS(c);
    }
  }

  function minifyDoc(str) {
    var doc = parseXML(str);
    var decl = xmlDecl(str);
    stripFmtWS(doc);
    return (decl ? decl : '') + new XMLSerializer().serializeToString(doc);
  }

  function highlightXML(line) {
    var h = esc(line);
    h = h.replace(/(&lt;[\/?!]?)([\w:.\-]+)/g, function (_, p, name) { return p + '<span class="json-key">' + name + '</span>'; });
    h = h.replace(/([\w:.\-]+)=(&quot;[^&]*?&quot;)/g, '<span class="json-num">$1</span>=<span class="json-str">$2</span>');
    return h;
  }

  function renderLines(str) {
    return str.split('\n').map(function (line, i) {
      return '<div class="json-line"><span class="line-num">' + (i + 1) + '</span><span class="line-content">' + highlightXML(line) + '</span></div>';
    }).join('');
  }

  function setStatus(type, msg) { status.innerHTML = '<span class="' + type + '">' + msg + '</span>'; }
  function show(str) { rawOutput = str; output.innerHTML = renderLines(str); }
  function clearOut() { rawOutput = ''; output.textContent = 'Formatted XML will appear here...'; status.innerHTML = ''; }

  function doFormat() {
    if (!input.value.trim()) { clearOut(); return; }
    try { var o = formatDoc(input.value); show(o); setStatus('valid', 'Well-formed XML — ' + o.split('\n').length + ' lines, ' + o.length + ' chars'); }
    catch (e) { setStatus('invalid', esc(e.message)); }
  }
  function doMinify() {
    if (!input.value.trim()) { clearOut(); return; }
    try { var o = minifyDoc(input.value); show(o); setStatus('valid', 'Minified — ' + o.length + ' chars'); }
    catch (e) { setStatus('invalid', esc(e.message)); }
  }
  function doValidate() {
    if (!input.value.trim()) { setStatus('', 'Nothing to validate yet.'); return; }
    try { var doc = parseXML(input.value); var n = doc.getElementsByTagName('*').length; setStatus('valid', '✓ Well-formed XML — ' + n + ' element' + (n === 1 ? '' : 's')); }
    catch (e) { setStatus('invalid', esc(e.message)); }
  }
  function doShare() {
    var v = input.value;
    if (!v.trim()) { setStatus('', 'Nothing to share yet.'); return; }
    if (v.length > 4000) { setStatus('invalid', 'Document too large to share via URL (over 4000 characters). Copy the output instead.'); return; }
    var url = location.origin + location.pathname + '#xml=' + encodeURIComponent(v);
    copyToClipboard(url, document.getElementById('btn-share'));
    setStatus('valid', 'Shareable link copied to clipboard.');
  }
  function loadHash() {
    var m = location.hash.match(/[#&]xml=([^&]*)/);
    if (m) { try { input.value = decodeURIComponent(m[1]); doFormat(); } catch (e) {} }
  }

  document.getElementById('btn-format').addEventListener('click', doFormat);
  document.getElementById('btn-minify').addEventListener('click', doMinify);
  document.getElementById('btn-validate').addEventListener('click', doValidate);
  document.getElementById('btn-share').addEventListener('click', doShare);
  document.getElementById('btn-clear').addEventListener('click', function () { input.value = ''; clearOut(); });
  document.getElementById('btn-copy').addEventListener('click', function () { copyToClipboard(rawOutput || output.textContent, document.getElementById('btn-copy')); });
  document.getElementById('btn-download').addEventListener('click', function () { downloadText(rawOutput || output.textContent, 'formatted.xml'); });
  input.addEventListener('paste', function () { setTimeout(doFormat, 50); });

  loadHash();
})();
