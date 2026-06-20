/**
 * Client-side error reporter — sends JS errors to Iris Dashboard.
 * Drop in /public/ of each venture + add <script src="/error-reporter.js"></script> before app.js.
 *
 * Config: set data-endpoint on the script tag, or defaults to https://dash.irisdigital.tech/api/logs/client
 */
(function () {
  'use strict';

  var script = document.currentScript;
  var endpoint = (script && script.getAttribute('data-endpoint')) ||
    'https://dash.irisdigital.tech/api/logs/client';

  var sent = {};
  var MAX_PER_TYPE = 10;
  var counts = { error: 0, rejection: 0, csp: 0 };

  // Allowlist : on ne reporte qu'une erreur dont l'origine est démontrablement la nôtre.
  // Le stack est la source de vérité quand il existe — il liste les vraies frames d'exécution.
  // Le filename peut être trompeusement l'URL du document hôte quand une extension exécute
  // eval() dans le contexte page (signature injFunc / <anonymous>) : on ne s'y fie qu'en
  // l'absence de stack. Pas de blacklist par pattern, règle structurelle unique.
  function isFromOurOrigin(filename, stack) {
    var origin = location.origin;
    if (stack) return stack.indexOf(origin) !== -1;
    if (filename) return filename.indexOf(origin) === 0;
    return false;
  }

  function describeReason(reason) {
    if (reason == null) return 'Unknown rejection';
    if (typeof reason === 'string') return reason;
    if (reason.message) return reason.message;
    try { return JSON.stringify(reason); } catch (e) { return String(reason); }
  }

  function send(type, payload) {
    if (counts[type] >= MAX_PER_TYPE) return;

    var key = type + '|' + payload.m + '|' + (payload.s || '') + '|' + (payload.l || '');
    if (sent[key]) return;
    sent[key] = true;
    counts[type]++;

    payload.t = type;
    payload.h = location.hostname;
    payload.p = location.pathname;

    try {
      navigator.sendBeacon(
        endpoint,
        new Blob([JSON.stringify(payload)], { type: 'text/plain' })
      );
    } catch (e) { /* silent */ }
  }

  window.addEventListener('error', function (e) {
    var filename = e.filename || '';
    var stack = (e.error && e.error.stack) || '';
    var message = e.message || '';

    // Cross-origin masqué par le navigateur (CORS) : message générique "Script error.", inutile.
    if (message === 'Script error.') return;
    if (!isFromOurOrigin(filename, stack)) return;

    send('error', {
      m: (message || 'Unknown error').slice(0, 512),
      s: filename || null,
      l: e.lineno || null,
      c: e.colno || null,
      k: stack ? stack.slice(0, 1024) : null
    });
  });

  window.addEventListener('unhandledrejection', function (e) {
    var reason = e.reason;
    var stack = (reason && reason.stack) || '';

    if (!isFromOurOrigin(null, stack)) return;

    send('rejection', {
      m: describeReason(reason).slice(0, 512),
      s: null,
      l: null,
      c: null,
      k: stack ? stack.slice(0, 1024) : null
    });
  });

  document.addEventListener('securitypolicyviolation', function (e) {
    var sourceFile = e.sourceFile || '';

    // Filtre par origine : violation reportée uniquement si sourceFile pointe vers notre
    // origin. Couvre les ressources/iframes cross-origin et les extensions dont le code
    // porte un sourceFile vide ou chrome-extension://. NE filtre PAS l'injection d'un
    // <style>/<script> inline directement dans le DOM (sourceFile = URL du document, sans
    // n° de ligne) : ce cas est écarté en aval côté dashboard (client-log-filter.js →
    // isThirdPartyInjection), pour éviter un re-déploiement de toutes les ventures.
    if (!isFromOurOrigin(sourceFile, '')) return;

    send('csp', {
      m: ('CSP ' + (e.violatedDirective || '?') + ' blocked ' + (e.blockedURI || 'inline')).slice(0, 512),
      s: sourceFile || null,
      l: e.lineNumber || null,
      c: e.columnNumber || null,
      k: e.sample ? e.sample.slice(0, 200) : null
    });
  });
})();

/**
 * Polyfill NodeList.prototype.forEach — moteurs anciens (vieux navigateurs, bots
 * d'indexation) ou querySelectorAll() ne renvoie pas un NodeList iterable via
 * .forEach(). Loge ici car error-reporter.js est charge en premier sur toutes les
 * pages, avant les scripts applicatifs : garantit l'API sans fichier supplementaire.
 */
(function () {
  'use strict';
  if (window.NodeList && NodeList.prototype && !NodeList.prototype.forEach) {
    NodeList.prototype.forEach = Array.prototype.forEach;
  }
})();
