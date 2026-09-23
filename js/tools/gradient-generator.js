(function () {
  var typeEl = document.getElementById('grad-type');
  var angleEl = document.getElementById('grad-angle');
  var angleGroup = document.getElementById('angle-group');
  var preview = document.getElementById('gradient-preview');
  var cssBox = document.getElementById('gradient-css');
  var stopsContainer = document.getElementById('grad-stops-container');
  var presetsGrid = document.getElementById('grad-presets-grid');

  // Meme garde du script manquant que les autres outils couleur (#3991), mais NON
  // bloquante : le degrade, les presets, l'angle et la sortie CSS ne touchent jamais
  // ColorUtils. Seules la saisie texte d'une couleur et Randomize en dependent. On les
  // desarme et on le dit, plutot que de tuer un outil qui marche encore a 90 %.
  var HAS_COLOR_UTILS = typeof ColorUtils !== 'undefined';

  var MIN_STOPS = 2;
  var MAX_STOPS = 10;

  var stops = [
    { color: '#6c5ce7', position: 0 },
    { color: '#00cec9', position: 100 }
  ];

  var PRESETS = [
    { name: 'Sunset', stops: [{color:'#ee9ca7',position:0},{color:'#ffdde1',position:100}] },
    { name: 'Ocean', stops: [{color:'#2193b0',position:0},{color:'#6dd5ed',position:100}] },
    { name: 'Aurora', stops: [{color:'#00c9ff',position:0},{color:'#92fe9d',position:100}] },
    { name: 'Velvet', stops: [{color:'#C33764',position:0},{color:'#1D2671',position:100}] },
    { name: 'Peach', stops: [{color:'#ffecd2',position:0},{color:'#fcb69f',position:100}] },
    { name: 'Neon', stops: [{color:'#12c2e9',position:0},{color:'#c471ed',position:50},{color:'#f64f59',position:100}] },
    { name: 'Forest', stops: [{color:'#134e5e',position:0},{color:'#71b280',position:100}] },
    { name: 'Candy', stops: [{color:'#fc5c7d',position:0},{color:'#6a82fb',position:100}] },
    { name: 'Fire', stops: [{color:'#f12711',position:0},{color:'#f5af19',position:100}] },
    { name: 'Frost', stops: [{color:'#000428',position:0},{color:'#004e92',position:100}] }
  ];

  function renderStops() {
    stopsContainer.innerHTML = '';
    stops.forEach(function (stop, idx) {
      var row = document.createElement('div');
      row.className = 'grad-stop-row';

      var colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = stop.color;
      colorInput.setAttribute('data-idx', idx);
      colorInput.addEventListener('input', function () {
        stops[idx].color = this.value;
        var textSib = this.nextElementSibling;
        if (textSib) textSib.value = this.value;
        update();
      });

      var textInput = document.createElement('input');
      textInput.type = 'text';
      textInput.value = stop.color;
      textInput.placeholder = '#hex, rgb(), hsl()';
      if (!HAS_COLOR_UTILS) {
        textInput.disabled = true;
        textInput.title = 'Color parsing is unavailable — use the picker.';
      }
      textInput.addEventListener('input', function () {
        var parsed = ColorUtils.parseColor(this.value);
        if (parsed) {
          var hex = ColorUtils.rgbToHex(parsed.r, parsed.g, parsed.b);
          stops[idx].color = hex;
          colorInput.value = hex;
          update();
        }
      });

      var posRange = document.createElement('input');
      posRange.type = 'range';
      posRange.min = '0';
      posRange.max = '100';
      posRange.value = stop.position;
      var posVal = document.createElement('span');
      posVal.className = 'grad-stop-position-val';
      posVal.textContent = stop.position + '%';
      posRange.addEventListener('input', function () {
        stops[idx].position = parseInt(this.value, 10);
        posVal.textContent = this.value + '%';
        update();
      });

      row.appendChild(colorInput);
      row.appendChild(textInput);
      row.appendChild(posRange);
      row.appendChild(posVal);

      if (stops.length > MIN_STOPS) {
        var removeBtn = document.createElement('button');
        removeBtn.className = 'grad-stop-remove';
        removeBtn.textContent = '\u00D7';
        removeBtn.title = 'Remove stop';
        removeBtn.addEventListener('click', function () {
          stops.splice(idx, 1);
          renderStops();
          update();
        });
        row.appendChild(removeBtn);
      }

      stopsContainer.appendChild(row);
    });
  }

  function update() {
    var colorStr = stops.map(function (s) {
      return s.color + ' ' + s.position + '%';
    }).join(', ');
    var css;

    angleGroup.style.display = (typeEl.value === 'linear' || typeEl.value === 'conic') ? '' : 'none';

    switch (typeEl.value) {
      case 'linear':
        css = 'linear-gradient(' + angleEl.value + 'deg, ' + colorStr + ')';
        break;
      case 'radial':
        css = 'radial-gradient(circle, ' + colorStr + ')';
        break;
      case 'conic':
        css = 'conic-gradient(from ' + angleEl.value + 'deg, ' + colorStr + ')';
        break;
    }

    preview.style.background = css;
    cssBox.textContent = 'background: ' + css + ';';
  }

  function renderPresets() {
    PRESETS.forEach(function (preset) {
      var item = document.createElement('div');
      item.className = 'grad-preset-item';
      var gradCss = preset.stops.map(function (s) {
        return s.color + ' ' + s.position + '%';
      }).join(', ');
      item.style.background = 'linear-gradient(135deg, ' + gradCss + ')';
      var label = document.createElement('span');
      label.textContent = preset.name;
      item.appendChild(label);
      item.addEventListener('click', function () {
        stops = preset.stops.map(function (s) { return { color: s.color, position: s.position }; });
        renderStops();
        update();
      });
      presetsGrid.appendChild(item);
    });
  }

  document.getElementById('grad-add-stop').addEventListener('click', function () {
    if (stops.length >= MAX_STOPS) return;
    var lastPos = stops[stops.length - 1].position;
    var newPos = Math.min(100, lastPos + Math.round((100 - lastPos) / 2));
    stops.push({ color: '#ffffff', position: newPos });
    renderStops();
    update();
  });

  typeEl.addEventListener('change', update);
  angleEl.addEventListener('input', update);

  document.getElementById('copy-gradient-css').addEventListener('click', function () {
    copyToClipboard(cssBox.textContent);
  });

  cssBox.addEventListener('click', function () {
    copyToClipboard(cssBox.textContent);
  });

  cssBox.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      copyToClipboard(cssBox.textContent);
    }
  });

  document.getElementById('random-gradient').addEventListener('click', function () {
    function randHex() {
      return ColorUtils.rgbToHex(
        Math.floor(Math.random() * 256),
        Math.floor(Math.random() * 256),
        Math.floor(Math.random() * 256)
      );
    }
    var count = 2 + Math.floor(Math.random() * 2);
    stops = [];
    for (var i = 0; i < count; i++) {
      stops.push({ color: randHex(), position: Math.round(i / (count - 1) * 100) });
    }
    angleEl.value = Math.floor(Math.random() * 360);
    renderStops();
    update();
  });

  if (!HAS_COLOR_UTILS) {
    document.getElementById('random-gradient').disabled = true;
    var warn = document.createElement('div');
    warn.className = 'status-bar';
    var warnText = document.createElement('span');
    warnText.className = 'invalid';
    warnText.textContent = 'Color parsing is unavailable — text entry and Randomize are off. '
      + 'The pickers, presets, angle and CSS output still work. Check your content blocker, then reload.';
    warn.appendChild(warnText);
    cssBox.parentNode.insertBefore(warn, cssBox);
  }

  renderPresets();
  renderStops();
  update();
})();
