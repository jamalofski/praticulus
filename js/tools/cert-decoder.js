(function () {
  'use strict';

  var SAMPLE = [
    '-----BEGIN CERTIFICATE-----',
    'MIIDdzCCAl+gAwIBAgIEAgAAuTANBgkqhkiG9w0BAQUFADBaMQswCQYDVQQGEwJJ',
    'RTESMBAGA1UEChMJQmFsdGltb3JlMRMwEQYDVQQLEwpDeWJlclRydXN0MSIwIAYD',
    'VQQDExlCYWx0aW1vcmUgQ3liZXJUcnVzdCBSb290MB4XDTAwMDUxMjE4NDYwMFoX',
    'DTI1MDUxMjIzNTkwMFowWjELMAkGA1UEBhMCSUUxEjAQBgNVBAoTCUJhbHRpbW9y',
    'ZTETMBEGA1UECxMKQ3liZXJUcnVzdDEiMCAGA1UEAxMZQmFsdGltb3JlIEN5YmVy',
    'VHJ1c3QgUm9vdDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAKMEuyKr',
    'mD1X6CZymrV51Cni4eiVgLGw41uOKymaZN+hXe2wCQVt2yguzmKiYv60iNoS6zjr',
    'IZ3AQSsBUnuId9Mcj8e6uYi1agnnc+gRQKfRzMpijS3ljwumUNKoUMMo6vWrJYeK',
    'mpYcqWe4PwzV9/lSEy/CG9VwcPCPwBLKBsua4dnKM3p31vjsufFoREJIE9LAwqSu',
    'XmD+tqYF/LTdB1kC1FkYmGP1pWPgkAx9XbIGevOF6uvUA65ehD5f/xXtabz5OTZy',
    'dc93Uk3zyZAsuT3lySNTPx8kmCFcB5kpvcY67Oduhjprl3RjM71oGDHweI12v/ye',
    'jl0qhqdNkNwnGjkCAwEAAaNFMEMwHQYDVR0OBBYEFOWdWTCCR1jMrPoIVDaGezq1',
    'BE3wMBIGA1UdEwEB/wQIMAYBAf8CAQMwDgYDVR0PAQH/BAQDAgEGMA0GCSqGSIb3',
    'DQEBBQUAA4IBAQCFDF2O5G9RaEIFoN27TyclhAO992T9Ldcw46QQF+vaKSm2eT92',
    '9hkTI7gQCvlYpNRhcL0EYWoSihfVCr3FvDB81ukMJY2GQE/szKN+OMY3EU/t3Wgx',
    'jkzSswF07r51XgdIGn9w/xZchMB5hbgF/X++ZRGjD8ACtPhSNzkE1akxehi/oCr0',
    'Epn3o0WC4zxe9Z2etciefC7IpJ5OCBRLbf1wbWsaY71k5h+3zvDyny67G7fyUIhz',
    'ksLi4xaNmjICq44Y3ekQEe5+NauQrz4wlHrQMz2nZQ/1/I6eYs9HRCwBXbsdtTLS',
    'R9I4LtD+gdwyah617jzV/OeBHRnDJELqYzmp',
    '-----END CERTIFICATE-----'
  ].join('\n');

  var els = {
    input: document.getElementById('cert-input'),
    status: document.getElementById('cert-status'),
    results: document.getElementById('cert-results'),
    validity: document.getElementById('cert-validity'),
    subject: document.getElementById('cert-subject'),
    issuer: document.getElementById('cert-issuer'),
    from: document.getElementById('cert-from'),
    to: document.getElementById('cert-to'),
    sans: document.getElementById('cert-sans'),
    key: document.getElementById('cert-key'),
    sigalg: document.getElementById('cert-sigalg'),
    serial: document.getElementById('cert-serial'),
    version: document.getElementById('cert-version'),
    fp256: document.getElementById('cert-fp256'),
    fp1: document.getElementById('cert-fp1')
  };

  var OID_NAME = {
    '2.5.4.3': 'CN', '2.5.4.6': 'C', '2.5.4.7': 'L', '2.5.4.8': 'ST', '2.5.4.9': 'STREET',
    '2.5.4.10': 'O', '2.5.4.11': 'OU', '2.5.4.5': 'serialNumber', '0.9.2342.19200300.100.1.25': 'DC',
    '1.2.840.113549.1.9.1': 'emailAddress',
    '1.2.840.113549.1.1.1': 'RSA', '1.2.840.10045.2.1': 'EC', '1.3.101.112': 'Ed25519', '1.3.101.113': 'Ed448',
    '1.2.840.113549.1.1.5': 'SHA-1 with RSA', '1.2.840.113549.1.1.11': 'SHA-256 with RSA',
    '1.2.840.113549.1.1.12': 'SHA-384 with RSA', '1.2.840.113549.1.1.13': 'SHA-512 with RSA',
    '1.2.840.113549.1.1.10': 'RSASSA-PSS', '1.2.840.113549.1.1.4': 'MD5 with RSA',
    '1.2.840.10045.4.1': 'ECDSA with SHA-1', '1.2.840.10045.4.3.2': 'ECDSA with SHA-256',
    '1.2.840.10045.4.3.3': 'ECDSA with SHA-384', '1.2.840.10045.4.3.4': 'ECDSA with SHA-512',
    '1.2.840.10045.3.1.7': 'P-256', '1.3.132.0.34': 'P-384', '1.3.132.0.35': 'P-521', '1.3.132.0.10': 'secp256k1'
  };

  function b64ToBytes(s) {
    var bin = atob(s.replace(/\s+/g, ''));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  function hexColons(bytes) {
    return Array.from(bytes).map(function (b) { return b.toString(16).padStart(2, '0'); }).join(':').toUpperCase();
  }

  // --- ASN.1 DER parser ---
  function parseNodes(bytes, pos, end) {
    var nodes = [];
    while (pos < end) {
      var tag = bytes[pos];
      var p = pos + 1;
      if (p > end) break;
      var len = bytes[p++];
      if (len & 0x80) {
        var n = len & 0x7f;
        len = 0;
        for (var i = 0; i < n; i++) len = len * 256 + bytes[p++];
      }
      var cs = p, ce = p + len;
      if (ce > end) ce = end;
      var node = {
        tag: tag, cls: (tag & 0xc0) >> 6, tagNum: tag & 0x1f,
        constructed: !!(tag & 0x20), content: bytes.subarray(cs, ce),
        start: pos, end: ce, children: null
      };
      if (node.constructed) node.children = parseNodes(bytes, cs, ce);
      nodes.push(node);
      pos = ce;
    }
    return nodes;
  }

  function decodeOid(bytes) {
    if (!bytes.length) return '';
    var values = [Math.floor(bytes[0] / 40), bytes[0] % 40];
    var val = 0;
    for (var i = 1; i < bytes.length; i++) {
      val = val * 128 + (bytes[i] & 0x7f);
      if (!(bytes[i] & 0x80)) { values.push(val); val = 0; }
    }
    return values.join('.');
  }

  function decodeString(node) {
    if (node.tag === 0x1e) { // BMPString (UTF-16BE)
      var s = '', b = node.content;
      for (var i = 0; i + 1 < b.length; i += 2) s += String.fromCharCode((b[i] << 8) | b[i + 1]);
      return s;
    }
    return new TextDecoder('utf-8').decode(node.content);
  }

  function parseName(nameNode) {
    var parts = [];
    (nameNode.children || []).forEach(function (rdn) {
      (rdn.children || []).forEach(function (atv) {
        if (!atv.children || atv.children.length < 2) return;
        var oid = decodeOid(atv.children[0].content);
        var label = OID_NAME[oid] || oid;
        parts.push(label + '=' + decodeString(atv.children[1]));
      });
    });
    return parts.join(', ');
  }

  function parseTime(node) {
    var s = new TextDecoder().decode(node.content);
    var m, date = null;
    if (node.tag === 0x17) { // UTCTime YYMMDDHHMMSSZ
      m = /^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?/.exec(s);
      if (m) {
        var yy = parseInt(m[1], 10);
        var year = yy >= 50 ? 1900 + yy : 2000 + yy;
        date = new Date(Date.UTC(year, +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)));
      }
    } else { // GeneralizedTime YYYYMMDDHHMMSSZ
      m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?/.exec(s);
      if (m) date = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)));
    }
    return date;
  }

  function ipFromBytes(b) {
    if (b.length === 4) return b[0] + '.' + b[1] + '.' + b[2] + '.' + b[3];
    if (b.length === 16) {
      var p = [];
      for (var i = 0; i < 16; i += 2) p.push(((b[i] << 8) | b[i + 1]).toString(16));
      return p.join(':');
    }
    return hexColons(b);
  }

  function keyInfo(spki) {
    try {
      var algNode = spki.children[0];
      var oid = decodeOid(algNode.children[0].content);
      if (oid === '1.2.840.113549.1.1.1') {
        var bs = spki.children[1].content; // BIT STRING: [unused][DER RSAPublicKey]
        var inner = parseNodes(bs, 1, bs.length)[0];
        var mod = inner.children[0].content;
        var mlen = mod.length - (mod[0] === 0 ? 1 : 0);
        return 'RSA ' + (mlen * 8) + '-bit';
      }
      if (oid === '1.2.840.10045.2.1') {
        var curve = algNode.children[1] ? decodeOid(algNode.children[1].content) : '';
        return ('EC ' + (OID_NAME[curve] || curve || '')).trim();
      }
      return OID_NAME[oid] || oid;
    } catch (e) { return 'unknown'; }
  }

  function parseSans(extensions) {
    if (!extensions) return [];
    var sanExt = null;
    (extensions.children || []).forEach(function (ext) {
      if (!ext.children || !ext.children.length) return;
      if (decodeOid(ext.children[0].content) === '2.5.29.17') sanExt = ext;
    });
    if (!sanExt) return [];
    var octet = sanExt.children[sanExt.children.length - 1];
    var seq = parseNodes(octet.content, 0, octet.content.length)[0];
    if (!seq || !seq.children) return [];
    var out = [];
    seq.children.forEach(function (gn) {
      var txt = new TextDecoder().decode(gn.content);
      if (gn.tag === 0x82) out.push('DNS: ' + txt);
      else if (gn.tag === 0x81) out.push('email: ' + txt);
      else if (gn.tag === 0x86) out.push('URI: ' + txt);
      else if (gn.tag === 0x87) out.push('IP: ' + ipFromBytes(gn.content));
      else out.push('[type ' + gn.tagNum + ']');
    });
    return out;
  }

  function getDer() {
    var text = els.input.value;
    var m = /-----BEGIN CERTIFICATE-----([\s\S]*?)-----END CERTIFICATE-----/.exec(text);
    if (m) return b64ToBytes(m[1]);
    var cleaned = text.replace(/\s+/g, '');
    if (cleaned.length > 40 && /^[A-Za-z0-9+/=]+$/.test(cleaned)) {
      try { return b64ToBytes(cleaned); } catch (e) { return null; }
    }
    return null;
  }

  function setRows(blank) {
    ['subject', 'issuer', 'from', 'to', 'sans', 'key', 'sigalg', 'serial', 'version', 'fp256', 'fp1'].forEach(function (k) {
      if (blank) els[k].textContent = '';
    });
  }

  function fingerprints(der) {
    els.fp256.innerHTML = '<span class="text-muted">computing…</span>';
    els.fp1.innerHTML = '<span class="text-muted">computing…</span>';
    crypto.subtle.digest('SHA-256', der).then(function (buf) {
      els.fp256.textContent = hexColons(new Uint8Array(buf));
    }).catch(function () { els.fp256.textContent = 'error'; });
    crypto.subtle.digest('SHA-1', der).then(function (buf) {
      els.fp1.textContent = hexColons(new Uint8Array(buf));
    }).catch(function () { els.fp1.textContent = 'error'; });
  }

  function decode() {
    var der = getDer();
    if (!der) {
      els.results.classList.add('d-none');
      els.status.innerHTML = els.input.value.trim() ? '<span class="invalid">No PEM certificate found — paste a -----BEGIN CERTIFICATE----- block.</span>' : '';
      return;
    }
    var cert, tc;
    try {
      cert = parseNodes(der, 0, der.length)[0];
      tc = cert.children[0].children; // tbsCertificate children
    } catch (e) {
      els.results.classList.add('d-none');
      els.status.innerHTML = '<span class="invalid">Could not parse as an X.509 certificate.</span>';
      return;
    }

    try {
      var idx = 0, version = 1;
      if (tc[0].cls === 2 && tc[0].tagNum === 0) {
        var vInt = tc[0].children[0];
        version = vInt.content[vInt.content.length - 1] + 1;
        idx = 1;
      }
      var serial = tc[idx++];
      idx++; // inner signature AlgorithmIdentifier (redundant with outer)
      var issuer = tc[idx++];
      var validity = tc[idx++];
      var subject = tc[idx++];
      var spki = tc[idx++];
      var extensions = null;
      for (var k = idx; k < tc.length; k++) {
        if (tc[k].cls === 2 && tc[k].tagNum === 3) { extensions = tc[k].children[0]; break; }
      }
      var sigAlgOid = decodeOid(cert.children[1].children[0].content);

      var notBefore = parseTime(validity.children[0]);
      var notAfter = parseTime(validity.children[1]);
      var sans = parseSans(extensions);
      var serialHex = hexColons(serial.content[0] === 0 && serial.content.length > 1 ? serial.content.subarray(1) : serial.content);

      els.subject.textContent = parseName(subject) || '(empty)';
      els.issuer.textContent = parseName(issuer) || '(empty)';
      els.from.textContent = notBefore ? notBefore.toUTCString() : '(unparsed)';
      els.to.textContent = notAfter ? notAfter.toUTCString() : '(unparsed)';
      els.sans.innerHTML = sans.length ? escapeHtml(sans.join('  ·  ')) : '<span class="text-muted">none</span>';
      els.key.textContent = keyInfo(spki);
      els.sigalg.textContent = OID_NAME[sigAlgOid] || sigAlgOid;
      els.serial.textContent = serialHex;
      els.version.textContent = 'v' + version;

      // validity badge
      var now = Date.now();
      var msg = '', cls = 'text-muted';
      if (notBefore && now < notBefore.getTime()) { msg = '✗ Not valid yet (starts ' + notBefore.toUTCString() + ')'; cls = 'invalid'; }
      else if (notAfter) {
        var days = Math.floor((notAfter.getTime() - now) / 86400000);
        if (days < 0) { msg = '✗ Expired ' + (-days) + ' day(s) ago'; cls = 'invalid'; }
        else if (days <= 30) { msg = '⚠ Expires in ' + days + ' day(s)'; cls = 'invalid'; }
        else { msg = '✓ Valid: ' + days + ' day(s) left'; cls = 'valid'; }
      }
      els.validity.innerHTML = '<span class="' + cls + '">' + msg + '</span>';

      els.results.classList.remove('d-none');
      els.status.innerHTML = '<span class="valid">✓ Certificate parsed</span>';
      fingerprints(der);
    } catch (e) {
      els.results.classList.add('d-none');
      els.status.innerHTML = '<span class="invalid">Parsed the envelope but could not read the certificate fields — is this a single X.509 cert?</span>';
    }
  }

  function derToPem(bytes) {
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    var b64 = btoa(bin).replace(/(.{64})/g, '$1\n');
    return '-----BEGIN CERTIFICATE-----\n' + b64 + '\n-----END CERTIFICATE-----';
  }

  els.input.addEventListener('input', decode);
  document.getElementById('cert-file').addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    document.getElementById('cert-file-label').textContent = file.name;
    var reader = new FileReader();
    reader.onload = function () {
      var bytes = new Uint8Array(reader.result);
      els.input.value = bytes[0] === 0x30 ? derToPem(bytes) : new TextDecoder().decode(bytes);
      decode();
    };
    reader.readAsArrayBuffer(file);
  });
  document.getElementById('btn-sample').addEventListener('click', function () { els.input.value = SAMPLE; decode(); });
  document.getElementById('btn-clear').addEventListener('click', function () {
    els.input.value = '';
    els.results.classList.add('d-none');
    els.status.innerHTML = '';
    document.getElementById('cert-file-label').textContent = 'Upload file';
    document.getElementById('cert-file').value = '';
  });
})();
