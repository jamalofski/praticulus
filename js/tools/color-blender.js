(function () {
  var c1 = document.getElementById('blend-color1');
  var c1Text = document.getElementById('blend-color1-text');
  var c2 = document.getElementById('blend-color2');
  var c2Text = document.getElementById('blend-color2-text');
  var stepsEl = document.getElementById('blend-steps');
  var stepsValue = document.getElementById('blend-steps-value');
  var hslToggle = document.getElementById('blend-hsl-toggle');
  var output = document.getElementById('blend-output');
  var codesEl = document.getElementById('blend-codes');

  // Garde du script manquant (#3991) : un ColorUtils absent prouve que color-utils.js
  // n'a pas ete execute du tout — bloqueur, 200 vide, cache tronque servi un an. Le
  // repli vit dans le fichier qui survit : duplique par outil, jamais factorise.
  if (typeof ColorUtils === 'undefined') {
    output.innerHTML = '<div class="status-bar"><span class="invalid">Could not load the color engine — check your connection or content blocker, then reload.</span></div>';
    return;
  }

  function syncTextToPicker(textInput, pickerInput) {
    var parsed = ColorUtils.parseColor(textInput.value);
    if (parsed) {
      pickerInput.value = ColorUtils.rgbToHex(parsed.r, parsed.g, parsed.b);
      update();
    }
  }

  function blendHsl(rgb1, rgb2, ratio) {
    var hsl1 = ColorUtils.rgbToHsl(rgb1.r, rgb1.g, rgb1.b);
    var hsl2 = ColorUtils.rgbToHsl(rgb2.r, rgb2.g, rgb2.b);
    var dh = hsl2.h - hsl1.h;
    if (dh > 180) dh -= 360;
    if (dh < -180) dh += 360;
    var h = (hsl1.h + dh * ratio + 360) % 360;
    var s = hsl1.s + (hsl2.s - hsl1.s) * ratio;
    var l = hsl1.l + (hsl2.l - hsl1.l) * ratio;
    var rgb = ColorUtils.hslToRgb(Math.round(h), Math.round(s), Math.round(l));
    return rgb;
  }

  function update() {
    var rgb1 = ColorUtils.hexToRgb(c1.value);
    var rgb2 = ColorUtils.hexToRgb(c2.value);
    var steps = parseInt(stepsEl.value, 10);
    var useHsl = hslToggle.checked;
    var colors = [];

    stepsValue.textContent = steps;

    for (var i = 0; i <= steps + 1; i++) {
      var ratio = i / (steps + 1);
      var blended = useHsl ? blendHsl(rgb1, rgb2, ratio) : ColorUtils.blendColors(rgb1, rgb2, ratio);
      colors.push(ColorUtils.rgbToHex(blended.r, blended.g, blended.b));
    }

    output.innerHTML = '';
    colors.forEach(function (hex) {
      var wrap = document.createElement('div');
      wrap.style.display = 'inline-flex';
      wrap.style.flexDirection = 'column';
      wrap.style.alignItems = 'center';
      var chip = document.createElement('div');
      chip.className = 'color-chip';
      chip.style.background = hex;
      chip.title = 'Click to copy ' + hex;
      var label = document.createElement('span');
      label.className = 'color-chip-label';
      label.textContent = hex;
      chip.addEventListener('click', (function (h) {
        return function () { copyToClipboard(h); };
      })(hex));
      wrap.appendChild(chip);
      wrap.appendChild(label);
      output.appendChild(wrap);
    });

    codesEl.textContent = colors.join('  ');
    window._blendColors = colors;
  }

  c1.addEventListener('input', function () {
    c1Text.value = c1.value;
    update();
  });
  c2.addEventListener('input', function () {
    c2Text.value = c2.value;
    update();
  });
  c1Text.addEventListener('input', function () { syncTextToPicker(c1Text, c1); });
  c2Text.addEventListener('input', function () { syncTextToPicker(c2Text, c2); });
  stepsEl.addEventListener('input', update);
  hslToggle.addEventListener('change', update);

  document.getElementById('copy-blend').addEventListener('click', function () {
    if (window._blendColors) copyToClipboard(window._blendColors.join(', '));
  });

  update();
})();
