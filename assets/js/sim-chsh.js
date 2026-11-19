/* EE608 Simulation 2: the CHSH game.
   Observables lie in the X-Z plane: A = cos(alpha) Z + sin(alpha) X.
   Correlations E_xy = <A(x) (x) B(y)>:
     v|Phi+><Phi+| + (1-v) I/4  ->  v cos(alpha - beta)
     (|00><00| + |11><11|)/2     ->  cos(alpha) cos(beta)
   For these states each party's outcomes are uniform, so
   P(a, b | x, y) = (1 + (-1)^(a XOR b) E_xy) / 4,
   S = E00 + E01 + E10 - E11 and P(win) = 1/2 + S/8 (Lecture 6).
   Math is typeset with KaTeX through SimTeX (sim-tex.js). */
(function () {
  'use strict';

  var DEG = Math.PI / 180;
  var MINUS = '−';
  var TSIRELSON = Math.cos(Math.PI / 8) * Math.cos(Math.PI / 8);
  var m = SimTeX.tex;

  var mode = 'quantum';      // 'quantum' | 'classical' | 'pr'
  var qstate = 'phi';        // 'phi' | 'eve'
  var bits = { a0: 0, a1: 0, b0: 0, b1: 0 };
  var logItems = [];
  var lastRun = null;

  var $ = function (id) { return document.getElementById(id); };

  function num(x, d) {
    d = d === undefined ? 3 : d;
    if (Math.abs(x) < 0.5 * Math.pow(10, -d)) x = 0;
    return (x < 0 ? MINUS : '') + Math.abs(x).toFixed(d);
  }
  function tn(x, d) {
    d = d === undefined ? 3 : d;
    if (Math.abs(x) < 0.5 * Math.pow(10, -d)) x = 0;
    return (x < 0 ? '-' : '') + Math.abs(x).toFixed(d);
  }
  function angle(id) { return +$(id).value; }
  function angleText(a) { return (a < 0 ? MINUS : '') + Math.abs(a) + '°'; }

  // Directions with a name in the lectures (TeX).
  var NAMED = { '0': 'Z', '90': 'X', '180': '-Z', '-180': '-Z', '-90': '-X',
    '45': 'D_+', '-45': 'D_-', '135': '-D_-', '-135': '-D_+' };
  // "A(0) = Z", or "A(0): alpha_0 = 30 deg" for an unnamed direction.
  function obsTeX(party, k) {
    var id = (party === 'A' ? 'a' : 'b') + k, a = angle(id);
    var name = NAMED[String(a)];
    if (name) return party + '(' + k + ') = ' + name;
    return party + '(' + k + '):\\ ' + (party === 'A' ? '\\alpha' : '\\beta') + '_' + k + ' = ' + a + '^\\circ';
  }

  /* ---------- the strategy as correlations ---------- */
  function corr(x, y) {
    if (mode === 'classical') return bits['a' + x] === bits['b' + y] ? 1 : -1;
    if (mode === 'pr') return x && y ? -1 : 1;
    var al = angle('a' + x) * DEG, be = angle('b' + y) * DEG;
    if (qstate === 'eve') return Math.cos(al) * Math.cos(be);
    return (+$('vis').value) * Math.cos(al - be);
  }
  function winGiven(x, y) { var e = corr(x, y); return x && y ? (1 - e) / 2 : (1 + e) / 2; }
  function chshS() { return corr(0, 0) + corr(0, 1) + corr(1, 0) - corr(1, 1); }

  // One round for given referee bits: returns answers a, b.
  function play(x, y) {
    if (mode === 'classical') return { a: bits['a' + x], b: bits['b' + y] };
    var a = Math.random() < 0.5 ? 0 : 1;
    var same = Math.random() < (1 + corr(x, y)) / 2;
    return { a: a, b: same ? a : 1 - a };
  }

  /* ---------- readouts ---------- */
  function exactHTML() {
    var rows = '', x, y;
    if (mode === 'classical') {
      for (x = 0; x < 2; x++) for (y = 0; y < 2; y++) {
        var ax = bits['a' + x], by = bits['b' + y], ok = (ax ^ by) === (x & y);
        rows += '<tr><td>' + m(x + ',\\,' + y) + '</td><td>' + m(String(x & y)) + '</td><td>' + m(ax + ' \\oplus ' + by + ' = ' + (ax ^ by)) +
          '</td><td>' + (ok ? 'yes' : '<span class="sim-loss">no</span>') + '</td></tr>';
      }
      return '<table class="sim-table"><thead><tr><th>' + m('x,\\,y') + '</th><th>' + m('x \\wedge y') + '</th><th>' + m('a(x) \\oplus b(y)') +
        '</th><th>Win?</th></tr></thead><tbody>' + rows + '</tbody></table>' + summaryHTML();
    }
    for (x = 0; x < 2; x++) for (y = 0; y < 2; y++) {
      var label = mode === 'pr' ? '–' : '<span class="nowrap">' + m(obsTeX('A', x)) + ',</span> <span class="nowrap">' + m(obsTeX('B', y)) + '</span>';
      rows += '<tr><td>' + m(x + ',\\,' + y) + '</td><td style="text-align:left">' + label + '</td><td>' + m(x && y ? 'a \\ne b' : 'a = b') +
        '</td><td>' + num(corr(x, y)) + '</td><td>' + num(winGiven(x, y)) + '</td></tr>';
    }
    return '<table class="sim-table"><thead><tr><th>' + m('x,\\,y') + '</th><th style="text-align:left">Observables</th><th>Need</th><th>' + m('E_{xy}') +
      '</th><th>' + m('P(\\text{win}\\mid x,y)') + '</th></tr></thead><tbody>' + rows + '</tbody></table>' + summaryHTML();
  }
  function summaryHTML() {
    var S = chshS();
    return '<p class="sim-readout" style="margin-top:0.7rem;">' +
      m('S = E_{00} + E_{01} + E_{10} - E_{11} = \\mathbf{' + tn(S) + '}') + '<br>' +
      m('P\\{\\text{win}\\} = \\tfrac12 + S/8 = \\mathbf{' + tn(0.5 + S / 8) + '}') + '</p>' +
      '<p class="sim-note">Bounds: ' + m('S \\le 2') + ' for classical strategies, ' + m('S \\le 2\\sqrt2 \\approx 2.828') +
      ' for quantum strategies, ' + m('S \\le 4') + ' under no-signalling alone.</p>';
  }

  function scoreHTML() {
    var p = 0.5 + chshS() / 8;
    function bar(label, value, cls) {
      return '<div class="bar-row"><span>' + label + '</span><span class="bar"><span' + cls + ' style="width:' + (value * 100).toFixed(1) +
        '%"></span><i style="left:75%"></i><i style="left:' + (TSIRELSON * 100).toFixed(1) + '%"></i></span><span>' + num(value) + '</span></div>';
    }
    var html = bar('Exact', p, ' class="alt"');
    if (lastRun) html += bar('Played', lastRun.wins / lastRun.n, '');
    html += '<p class="sim-note">Ticks at ' + m('3/4') + ' (best classical strategy) and ' + m('\\cos^2(\\pi/8) \\approx 0.854') + ' (best quantum strategy).' +
      (lastRun ? ' "Played" is the win rate of the last ' + lastRun.n + ' rounds.' : '') + '</p>';
    return html;
  }

  function resultsHTML(R) {
    var rows = '';
    for (var k = 0; k < 4; k++) {
      var c = R.cells[k], x = k >> 1, y = k & 1;
      rows += '<tr><td>' + m(x + ',\\,' + y) + '</td><td>' + c.n + '</td><td>' + c.w + '</td><td>' + num(c.n ? c.w / c.n : 0) +
        '</td><td>' + num(c.n ? (2 * c.same - c.n) / c.n : 0) + '</td></tr>';
    }
    var est = function (k) { var c = R.cells[k]; return c.n ? (2 * c.same - c.n) / c.n : 0; };
    var Sest = est(0) + est(1) + est(2) - est(3);
    return '<table class="sim-table"><thead><tr><th>' + m('x,\\,y') + '</th><th>Rounds</th><th>Wins</th><th>Win rate</th><th>Estimated ' + m('E_{xy}') +
      '</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p class="sim-readout" style="margin-top:0.7rem;">Win rate <strong>' + num(R.wins / R.n) + '</strong> over ' + R.n + ' rounds. Estimated ' +
      m('S = ' + tn(Sest)) + '.</p>' +
      '<p class="sim-readout">Alice answered ' + m('a = 0') + ' in ' + num(R.a0y[0] / R.ny[0]) + ' of the rounds with ' + m('y = 0') +
      ' and in ' + num(R.a0y[1] / R.ny[1]) + ' of the rounds with ' + m('y = 1') + '.</p>';
  }

  function log(html) {
    logItems.unshift(html);
    logItems = logItems.slice(0, 6);
    $('log').innerHTML = logItems.map(function (t) { return '<li>' + t + '</li>'; }).join('');
  }

  /* ---------- drawing ---------- */
  var canvas = $('dirs');
  var ctx = canvas.getContext('2d');
  var labels = SimTeX.overlay(canvas);
  var cx = 0, cy = 0, R = 0;
  var cssVars = getComputedStyle(document.documentElement);
  function cssColor(name, fallback) { return cssVars.getPropertyValue(name).trim() || fallback; }
  var C = {
    discFill: cssColor('--sim-disc-fill', 'transparent'),
    sphereLine: cssColor('--sim-sphere-line', '#5c6470'),
    alice: cssColor('--color-accent', '#1f3a5f'),
    bob: cssColor('--sim-measure', '#b4532a'),
    text: cssColor('--color-text', '#202329'),
    muted: cssColor('--color-text-muted', '#5c6470'),
    border: cssColor('--color-border', '#e3e0d8')
  };
  var ARROWS = [
    { id: 'a0', who: 'alice', label: 'A(0)' }, { id: 'a1', who: 'alice', label: 'A(1)' },
    { id: 'b0', who: 'bob', label: 'B(0)' }, { id: 'b1', who: 'bob', label: 'B(1)' }
  ];
  var AXIS_LABELS = [
    { key: 'z', a: 0, tex: 'Z', r: 1.17 }, { key: 'mz', a: 180, tex: '-Z', r: 1.17 },
    { key: 'x', a: 90, tex: 'X', r: 1.17 }, { key: 'mx', a: -90, tex: '-X', r: 1.19 },
    { key: 'dp', a: 45, tex: 'D_+', r: 1.13 }, { key: 'dm', a: -45, tex: 'D_-', r: 1.13 }
  ];

  function pt(aDeg, r) { var a = aDeg * DEG; return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) }; }
  function arrow(aDeg, color, width) {
    var tip = pt(aDeg, R);
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tip.x, tip.y); ctx.stroke();
    var a = aDeg * DEG, ux = Math.sin(a), uy = -Math.cos(a), s = 12, w = 0.45;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(tip.x - s * ux + s * w * uy, tip.y - s * uy - s * w * ux);
    ctx.lineTo(tip.x - s * ux - s * w * uy, tip.y - s * uy + s * w * ux);
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(tip.x, tip.y, 5, 0, 2 * Math.PI); ctx.fill();
  }

  function draw() {
    if (!R) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var faded = mode !== 'quantum';
    var alpha = faded ? 0.3 : 1;
    ctx.globalAlpha = alpha;

    // Circle, axes and the D directions.
    ctx.fillStyle = C.discFill; ctx.strokeStyle = C.sphereLine; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = C.border; ctx.lineWidth = 1;
    [0, 90].forEach(function (a) { var p = pt(a, R * 1.08), q = pt(a + 180, R * 1.08); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); });
    ctx.setLineDash([3, 4]);
    [45, -45].forEach(function (a) { var p = pt(a, R), q = pt(a + 180, R); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); });
    ctx.setLineDash([]);
    AXIS_LABELS.forEach(function (L) {
      var p = pt(L.a, R * L.r);
      labels.set(L.key, L.tex, p.x, p.y, L.tex.charAt(0) === '-' || L.tex.charAt(0) === 'D' ? C.muted : C.text, alpha);
    });

    if (!faded) {
      ARROWS.forEach(function (ar, i) {
        var a = angle(ar.id), color = C[ar.who];
        arrow(a, color, 3);
        // Label beside the arrow; the two arrows of a party get opposite sides.
        var side = (i % 2 === 0) ? -1 : 1;
        var base = pt(a, R * 0.76), rad = a * DEG;
        labels.set(ar.id, ar.label, base.x + side * 20 * Math.cos(rad), base.y + side * 20 * Math.sin(rad), color);
      });
      labels.hide('msg');
    } else {
      ARROWS.forEach(function (ar) { labels.hide(ar.id); });
      labels.set('msg', mode === 'classical' ? '\\text{Classical strategy: answers fixed in advance}' : '\\text{PR box: no measurement directions}',
        cx, cy, C.text);
    }
    ctx.globalAlpha = 1;
  }

  function resize() {
    var w = canvas.clientWidth;
    if (!w) return;
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(w * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = w / 2; cy = w / 2; R = w * 0.36;
    draw();
  }

  /* ---------- dragging arrow tips ---------- */
  var dragging = null;
  function local(e) { var b = canvas.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; }
  canvas.addEventListener('pointerdown', function (e) {
    if (mode !== 'quantum') return;
    var p = local(e), best = null, bestD = 22;
    ARROWS.forEach(function (ar) {
      var t = pt(angle(ar.id), R), d = Math.hypot(t.x - p.x, t.y - p.y);
      if (d < bestD) { bestD = d; best = ar.id; }
    });
    if (best) { dragging = best; canvas.setPointerCapture(e.pointerId); }
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var p = local(e);
    var a = Math.round(Math.atan2(p.x - cx, cy - p.y) / DEG);
    var snap = Math.round(a / 45) * 45;
    if (Math.abs(a - snap) <= 3) a = snap;       // snap to multiples of 45 degrees
    if (a === -180) a = 180;
    $(dragging).value = a;
    changed();
  });
  ['pointerup', 'pointercancel'].forEach(function (t) { canvas.addEventListener(t, function () { dragging = null; }); });

  /* ---------- controls ---------- */
  function syncOutputs() {
    ['a0', 'a1', 'b0', 'b1'].forEach(function (id) { $(id + '-out').textContent = angleText(angle(id)); });
    $('vis-out').textContent = (+$('vis').value).toFixed(2);
    document.querySelectorAll('[data-bit]').forEach(function (b) {
      var k = b.getAttribute('data-bit');
      b.innerHTML = m(k.charAt(0) + '(' + k.charAt(1) + ') = ' + bits[k]);
    });
  }
  function refresh() {
    syncOutputs();
    $('exact').innerHTML = exactHTML();
    $('score').innerHTML = scoreHTML();
    draw();
  }
  // Earlier results do not describe the new strategy.
  function changed() {
    lastRun = null;
    $('results').innerHTML = '';
    refresh();
  }

  ['a0', 'a1', 'b0', 'b1', 'vis'].forEach(function (id) { $(id).addEventListener('input', changed); });

  function setAngles(v) { ['a0', 'a1', 'b0', 'b1'].forEach(function (id, i) { $(id).value = v[i]; }); changed(); }
  $('preset-l3').addEventListener('click', function () { setAngles([0, 90, 45, -45]); });
  $('preset-zx').addEventListener('click', function () { setAngles([0, 90, 0, 90]); });

  document.querySelectorAll('[data-mode]').forEach(function (b) {
    b.addEventListener('click', function () {
      mode = b.getAttribute('data-mode');
      document.querySelectorAll('[data-mode]').forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
      $('quantum-controls').classList.toggle('sim-hidden', mode !== 'quantum');
      $('classical-controls').classList.toggle('sim-hidden', mode !== 'classical');
      $('pr-controls').classList.toggle('sim-hidden', mode !== 'pr');
      changed();
    });
  });
  document.querySelectorAll('[data-state]').forEach(function (b) {
    b.addEventListener('click', function () {
      qstate = b.getAttribute('data-state');
      document.querySelectorAll('[data-state]').forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
      $('noise-control').classList.toggle('sim-hidden', qstate !== 'phi');
      $('eve-note').classList.toggle('sim-hidden', qstate !== 'eve');
      changed();
    });
  });
  document.querySelectorAll('[data-bit]').forEach(function (b) {
    b.addEventListener('click', function () { var k = b.getAttribute('data-bit'); bits[k] = 1 - bits[k]; changed(); });
  });

  $('play-one').addEventListener('click', function () {
    var x = Math.random() < 0.5 ? 0 : 1, y = Math.random() < 0.5 ? 0 : 1;
    var r = play(x, y), win = (r.a ^ r.b) === (x & y);
    var t = m('x = ' + x + ',\\ y = ' + y) + '. ';
    if (mode === 'quantum') {
      t += 'Alice measures ' + m(obsTeX('A', x)) + ': outcome ' + m(r.a ? '-1' : '+1') + ', ' + m('a = ' + r.a) + '. ' +
        'Bob measures ' + m(obsTeX('B', y)) + ': outcome ' + m(r.b ? '-1' : '+1') + ', ' + m('b = ' + r.b) + '. ';
    } else {
      t += m('a = ' + r.a + ',\\ b = ' + r.b) + '. ';
    }
    t += m('a \\oplus b = ' + (r.a ^ r.b) + (win ? ' = ' : ' \\ne ') + 'x \\wedge y') + ': ' +
      (win ? '<span class="sim-win">win</span>.' : '<span class="sim-loss">loss</span>.');
    log(t);
  });

  $('play-many').addEventListener('click', function () {
    var n = +$('rounds').value;
    var R2 = { n: n, wins: 0, cells: [0, 1, 2, 3].map(function () { return { n: 0, w: 0, same: 0 }; }), a0y: [0, 0], ny: [0, 0] };
    for (var i = 0; i < n; i++) {
      var x = Math.random() < 0.5 ? 0 : 1, y = Math.random() < 0.5 ? 0 : 1;
      var r = play(x, y), c = R2.cells[2 * x + y];
      var win = (r.a ^ r.b) === (x & y);
      c.n++; if (win) { c.w++; R2.wins++; } if (r.a === r.b) c.same++;
      R2.ny[y]++; if (r.a === 0) R2.a0y[y]++;
    }
    lastRun = R2;
    $('results').innerHTML = resultsHTML(R2);
    $('score').innerHTML = scoreHTML();
  });

  window.addEventListener('resize', resize);
  SimTeX.renderIn(document.querySelector('main'));
  refresh();
  resize();
})();
