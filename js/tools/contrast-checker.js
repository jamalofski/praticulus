(function () {
  var fgColor = document.getElementById('fg-color');
  var bgColor = document.getElementById('bg-color');
  var fgHex = document.getElementById('fg-hex');
  var bgHex = document.getElementById('bg-hex');
  var preview = document.getElementById('contrast-preview');
  var ratioDisplay = document.getElementById('ratio-display');
  var badges = document.getElementById('badges');

  // Garde du script manquant (#3991) : un ColorUtils absent prouve que color-utils.js
  // n'a pas ete execute du tout — bloqueur, 200 vide, cache tronque servi un an. Le
  // repli vit dans le fichier qui survit : duplique par outil, jamais factorise.
  if (typeof ColorUtils === 'undefined') {
    ratioDisplay.textContent = '—';
    badges.innerHTML = '<div class="status-bar"><span class="invalid">Could not load the color engine — check your connection or content blocker, then reload.</span></div>';
    return;
  }

  function syncHexFromPicker(picker, hexInput) {
    hexInput.value = picker.value;
  }

  function syncPickerFromHex(hexInput, picker) {
    var parsed = ColorUtils.parseColor(hexInput.value);
    if (parsed) {
      var hex = ColorUtils.rgbToHex(parsed.r, parsed.g, parsed.b);
      picker.value = hex;
      hexInput.classList.remove('hex-input-invalid');
    } else {
      hexInput.classList.add('hex-input-invalid');
    }
  }

  function update() {
    var fg = ColorUtils.hexToRgb(fgColor.value);
    var bg = ColorUtils.hexToRgb(bgColor.value);
    var ratio = ColorUtils.contrastRatio(fg, bg);
    var r = ratio.toFixed(2);

    preview.style.color = fgColor.value;
    preview.style.background = bgColor.value;
    ratioDisplay.textContent = r + ':1';

    var checks = [
      { label: 'AA Normal', pass: ratio >= 4.5 },
      { label: 'AA Large', pass: ratio >= 3 },
      { label: 'AAA Normal', pass: ratio >= 7 },
      { label: 'AAA Large', pass: ratio >= 4.5 }
    ];

    badges.innerHTML = checks.map(function (c) {
      return '<span class="badge ' + (c.pass ? 'badge-pass' : 'badge-fail') + '">' +
        (c.pass ? '✓' : '✗') + ' ' + c.label + '</span>';
    }).join('');
  }

  function suggestFix() {
    var fg = ColorUtils.hexToRgb(fgColor.value);
    var bg = ColorUtils.hexToRgb(bgColor.value);
    var ratio = ColorUtils.contrastRatio(fg, bg);
    if (ratio >= 4.5) {
      showToast('Already meets AA (4.5:1)!');
      return;
    }
    var hsl = ColorUtils.rgbToHsl(fg.r, fg.g, fg.b);
    var bgLum = ColorUtils.luminance(bg.r, bg.g, bg.b);
    var direction = bgLum > 0.5 ? -1 : 1;
    for (var i = 0; i <= 100; i++) {
      var testL = Math.max(0, Math.min(100, hsl.l + (direction * i)));
      var testRgb = ColorUtils.hslToRgb(hsl.h, hsl.s, testL);
      var testRatio = ColorUtils.contrastRatio(testRgb, bg);
      if (testRatio >= 4.5) {
        var newHex = ColorUtils.rgbToHex(testRgb.r, testRgb.g, testRgb.b);
        fgColor.value = newHex;
        fgHex.value = newHex;
        update();
        showToast('Fixed! Ratio now meets AA.');
        return;
      }
    }
    showToast('Could not find a fix by adjusting lightness.');
  }

  fgColor.addEventListener('input', function () {
    syncHexFromPicker(fgColor, fgHex);
    update();
  });
  bgColor.addEventListener('input', function () {
    syncHexFromPicker(bgColor, bgHex);
    update();
  });

  fgHex.addEventListener('input', function () {
    syncPickerFromHex(fgHex, fgColor);
    update();
  });
  bgHex.addEventListener('input', function () {
    syncPickerFromHex(bgHex, bgColor);
    update();
  });

  document.getElementById('swap-colors').addEventListener('click', function () {
    var tmp = fgColor.value;
    fgColor.value = bgColor.value;
    bgColor.value = tmp;
    fgHex.value = fgColor.value;
    bgHex.value = bgColor.value;
    update();
  });

  document.getElementById('suggest-fix').addEventListener('click', suggestFix);

  update();
})();
