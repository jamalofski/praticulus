(function () {
  var pickerInput = document.getElementById('picker-input');
  var hexInput = document.getElementById('hex-input');
  var swatch = document.getElementById('preview-swatch');
  var valRgb = document.getElementById('val-rgb');
  var valHsl = document.getElementById('val-hsl');
  var valCmyk = document.getElementById('val-cmyk');
  var shadesStrip = document.getElementById('shades-strip');
  var fgColor = document.getElementById('fg-color');
  var bgColor = document.getElementById('bg-color');
  var contrastRatio = document.getElementById('contrast-ratio');
  var contrastPreview = document.getElementById('contrast-preview');
  var contrastBadges = document.getElementById('contrast-badges');
  var WHITE = {r:255,g:255,b:255};
  var BLACK = {r:0,g:0,b:0};

  // Garde du script manquant (#3991) : un ColorUtils absent prouve que color-utils.js
  // n'a pas ete execute du tout — bloqueur, 200 vide, cache tronque servi un an. Le
  // repli vit dans le fichier qui survit : duplique par outil, jamais factorise.
  if (typeof ColorUtils === 'undefined') {
    [valRgb, valHsl, valCmyk].forEach(function (el) { el.textContent = '—'; });
    shadesStrip.innerHTML = '<div class="status-bar"><span class="invalid">Could not load the color engine — check your connection or content blocker, then reload.</span></div>';
    return;
  }

  function update(hex) {
    var rgb = ColorUtils.hexToRgb(hex);
    var hsl = ColorUtils.rgbToHsl(rgb.r, rgb.g, rgb.b);
    var cmyk = ColorUtils.rgbToCmyk(rgb.r, rgb.g, rgb.b);
    swatch.style.background = hex;
    valRgb.textContent = 'rgb(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ')';
    valHsl.textContent = 'hsl(' + hsl.h + ', ' + hsl.s + '%, ' + hsl.l + '%)';
    valCmyk.textContent = 'cmyk(' + cmyk.c + '%, ' + cmyk.m + '%, ' + cmyk.y + '%, ' + cmyk.k + '%)';
    fgColor.value = hex;
    renderShades(rgb);
    updateContrast(rgb);
  }

  function renderShades(rgb) {
    shadesStrip.innerHTML = '';
    var steps = [];
    for (var i = 5; i >= 1; i--) steps.push(ColorUtils.blendColors(rgb, WHITE, i / 5));
    steps.push(rgb);
    for (var j = 1; j <= 5; j++) steps.push(ColorUtils.blendColors(rgb, BLACK, j / 5));
    steps.forEach(function(c) {
      var hex = ColorUtils.rgbToHex(c.r, c.g, c.b);
      var el = document.createElement('div');
      el.className = 'shade-swatch';
      el.style.background = hex;
      el.title = hex;
      el.addEventListener('click', function() {
        hexInput.value = hex;
        pickerInput.value = hex;
        update(hex);
      });
      shadesStrip.appendChild(el);
    });
  }

  function updateContrast(fgRgb) {
    var bgParsed = ColorUtils.parseColor(bgColor.value);
    if (!bgParsed) return;
    var ratio = ColorUtils.contrastRatio(fgRgb, bgParsed);
    var r = Math.round(ratio * 100) / 100;
    contrastRatio.textContent = r + ':1';
    var fgHex = ColorUtils.rgbToHex(fgRgb.r, fgRgb.g, fgRgb.b);
    var bgHex = ColorUtils.rgbToHex(bgParsed.r, bgParsed.g, bgParsed.b);
    contrastPreview.style.color = fgHex;
    contrastPreview.style.backgroundColor = bgHex;
    var checks = [
      {label: 'AA Normal', pass: ratio >= 4.5},
      {label: 'AA Large', pass: ratio >= 3},
      {label: 'AAA Normal', pass: ratio >= 7},
      {label: 'AAA Large', pass: ratio >= 4.5}
    ];
    contrastBadges.innerHTML = checks.map(function(c) {
      return '<span class="badge ' + (c.pass ? 'badge-pass' : 'badge-fail') + '">' + (c.pass ? '\u2713 ' : '\u2717 ') + c.label + '</span>';
    }).join('');
  }

  pickerInput.addEventListener('input', function () {
    hexInput.value = this.value;
    update(this.value);
  });

  hexInput.addEventListener('input', function () {
    var parsed = ColorUtils.parseColor(this.value);
    if (parsed) {
      var hex = ColorUtils.rgbToHex(parsed.r, parsed.g, parsed.b);
      pickerInput.value = hex;
      update(hex);
    }
  });

  bgColor.addEventListener('input', function () {
    var rgb = ColorUtils.hexToRgb(pickerInput.value);
    updateContrast(rgb);
  });

  var pickButton = document.getElementById('pick-from-screen');
  if ('EyeDropper' in window) {
    pickButton.classList.remove('d-none');
    pickButton.addEventListener('click', function () {
      new window.EyeDropper().open().then(function (result) {
        var hex = result.sRGBHex.toLowerCase();
        hexInput.value = hex;
        pickerInput.value = hex;
        update(hex);
      }).catch(function () { /* AbortError: user pressed Escape — silent */ });
    });
  }

  document.getElementById('copy-hex').addEventListener('click', function () { copyToClipboard(hexInput.value); });
  document.querySelectorAll('.clickable-result').forEach(function (el) {
    el.addEventListener('click', function () { copyToClipboard(this.textContent); });
  });

  update('#6c5ce7');
})();
