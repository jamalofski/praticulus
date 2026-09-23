(function () {
  var baseColor = document.getElementById('base-color');
  var baseColorText = document.getElementById('base-color-text');
  var harmonyType = document.getElementById('harmony-type');
  var output = document.getElementById('palette-output');
  var codes = document.getElementById('palette-codes');
  var exportBtn = document.getElementById('palette-export-btn');
  var exportDropdown = document.getElementById('palette-export-dropdown');

  // Garde du script manquant (#3991) : un ColorUtils absent prouve que color-utils.js
  // n'a pas ete execute du tout — bloqueur, 200 vide, cache tronque servi un an. Le
  // repli vit dans le fichier qui survit : duplique par outil, jamais factorise.
  if (typeof ColorUtils === 'undefined') {
    output.innerHTML = '<div class="status-bar"><span class="invalid">Could not load the color engine — check your connection or content blocker, then reload.</span></div>';
    return;
  }

  function generatePalette() {
    var hex = baseColor.value;
    var rgb = ColorUtils.hexToRgb(hex);
    var hsl = ColorUtils.rgbToHsl(rgb.r, rgb.g, rgb.b);
    var colors = [];
    var type = harmonyType.value;

    switch (type) {
      case 'complementary':
        colors = [hsl.h, (hsl.h + 180) % 360];
        break;
      case 'analogous':
        colors = [(hsl.h - 30 + 360) % 360, hsl.h, (hsl.h + 30) % 360];
        break;
      case 'triadic':
        colors = [hsl.h, (hsl.h + 120) % 360, (hsl.h + 240) % 360];
        break;
      case 'split':
        colors = [hsl.h, (hsl.h + 150) % 360, (hsl.h + 210) % 360];
        break;
      case 'tetradic':
        colors = [hsl.h, (hsl.h + 90) % 360, (hsl.h + 180) % 360, (hsl.h + 270) % 360];
        break;
      case 'monochromatic':
        colors = [];
        for (var l = 20; l <= 80; l += 15) {
          var c = ColorUtils.hslToRgb(hsl.h, hsl.s, l);
          colors.push(ColorUtils.rgbToHex(c.r, c.g, c.b));
        }
        break;
    }

    if (type !== 'monochromatic') {
      colors = colors.map(function (h) {
        var c = ColorUtils.hslToRgb(h, hsl.s, hsl.l);
        return ColorUtils.rgbToHex(c.r, c.g, c.b);
      });
    }

    output.innerHTML = '';
    colors.forEach(function (c) {
      var wrap = document.createElement('div');
      wrap.style.display = 'inline-flex';
      wrap.style.flexDirection = 'column';
      wrap.style.alignItems = 'center';
      var chip = document.createElement('div');
      chip.className = 'color-chip';
      chip.style.background = c;
      chip.title = 'Click to copy ' + c;
      var label = document.createElement('span');
      label.className = 'color-chip-label';
      label.textContent = c;
      chip.addEventListener('click', (function (hex) {
        return function () { copyToClipboard(hex); };
      })(c));
      wrap.appendChild(chip);
      wrap.appendChild(label);
      output.appendChild(wrap);
    });

    codes.textContent = colors.join('  ');
    window._paletteColors = colors;
  }

  function doRandomize() {
    baseColor.value = ColorUtils.rgbToHex(
      Math.floor(Math.random() * 256),
      Math.floor(Math.random() * 256),
      Math.floor(Math.random() * 256)
    );
    baseColorText.value = baseColor.value;
    generatePalette();
  }

  function exportAs(format) {
    var colors = window._paletteColors || [];
    var text = '';
    switch (format) {
      case 'css':
        text = ':root {\n' + colors.map(function (c, i) {
          return '  --color-' + (i + 1) + ': ' + c + ';';
        }).join('\n') + '\n}';
        break;
      case 'tailwind':
        text = 'colors: {\n' + colors.map(function (c, i) {
          return '  \'color-' + (i + 1) + '\': \'' + c + '\',';
        }).join('\n') + '\n}';
        break;
      case 'scss':
        text = colors.map(function (c, i) {
          return '$color-' + (i + 1) + ': ' + c + ';';
        }).join('\n');
        break;
    }
    if (text) copyToClipboard(text);
    exportDropdown.classList.remove('open');
  }

  baseColor.addEventListener('input', function () {
    baseColorText.value = baseColor.value;
    generatePalette();
  });

  baseColorText.addEventListener('input', function () {
    var parsed = ColorUtils.parseColor(this.value);
    if (parsed) {
      baseColor.value = ColorUtils.rgbToHex(parsed.r, parsed.g, parsed.b);
      generatePalette();
    }
  });

  harmonyType.addEventListener('change', generatePalette);

  document.getElementById('copy-palette').addEventListener('click', function () {
    if (window._paletteColors) copyToClipboard(window._paletteColors.join(', '));
  });

  document.getElementById('randomize').addEventListener('click', doRandomize);

  document.addEventListener('keydown', function (e) {
    if (e.code === 'Space' && e.target === document.body) {
      e.preventDefault();
      doRandomize();
    }
  });

  exportBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    exportDropdown.classList.toggle('open');
  });

  exportDropdown.querySelectorAll('button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      exportAs(this.getAttribute('data-format'));
    });
  });

  document.addEventListener('click', function () {
    exportDropdown.classList.remove('open');
  });

  generatePalette();
})();
