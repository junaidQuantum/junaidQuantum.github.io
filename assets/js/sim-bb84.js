/* EE608 Simulation 3: BB84 with an eavesdropper and channel noise.
   Qubits are Bloch vectors. Alice sends +/- the axis of her basis (bit 0 -> +).
   Eve:
     intercept and resend (fraction f): measure in a random basis, resend the state found;
     controlled-rotation probe (Lectures 8, 9): Z-basis states pass unchanged, the X and Y
       components shrink by cos(theta/2); Eve guesses a Z-basis bit with the Helstrom
       probability (1 + sin(theta/2))/2 and learns nothing about X-basis bits.
   Channel: dephasing (x, y -> (1-2p) x, y), depolarizing (r -> (1-p) r).
   Bob measures along the axis of his basis; outcome +1 means bit 0.
   Key rate r = 1 - 2 h(Q) per sifted bit (Lecture 6). */
(function () {
  'use strict';

  var m = SimTeX.tex;
  var MINUS = '\u2212';
  var AX = { Z: [0, 0, 1], X: [1, 0, 0] };
  var KET = { 'Z0': '\\ket{0}', 'Z1': '\\ket{1}', 'X0': '\\ket{+}', 'X1': '\\ket{-}' };
  var N_SHOW = 12;

  var eve = 'none';      // 'none' | 'ir' | 'probe'
  var noise = 'none';    // 'none' | 'dephasing' | 'depolarizing'
  var lastRun = null;

  var $ = function (id) { return document.getElementById(id); };
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function num(x, d) {
    d = d === undefined ? 3 : d;
    if (Math.abs(x) < 0.5 * Math.pow(10, -d)) x = 0;
    return (x < 0 ? MINUS : '') + Math.abs(x).toFixed(d);
  }
  function rbit() { return Math.random() < 0.5 ? 0 : 1; }

  /* ---------- information theory ---------- */
  function h2(x) { return x <= 0 || x >= 1 ? 0 : -x * Math.log2(x) - (1 - x) * Math.log2(1 - x); }
  function keyRate(Q) { return 1 - 2 * h2(Math.min(Q, 0.5)); }
  var QSTAR = (function () {               // r(Q) = 0, about 0.110
    var lo = 0.01, hi = 0.3;
    for (var i = 0; i < 60; i++) { var mid = (lo + hi) / 2; if (keyRate(mid) > 0) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  })();

  /* ---------- model ---------- */
  function frac() { return +$('frac').value; }
  function theta() { return +$('theta').value * Math.PI / 180; }
  function pnoise() { return +$('p').value; }

  function channel(r) {
    var p = pnoise();
    if (noise === 'dephasing') return [(1 - 2 * p) * r[0], (1 - 2 * p) * r[1], r[2]];
    if (noise === 'depolarizing') return [(1 - p) * r[0], (1 - p) * r[1], (1 - p) * r[2]];
    return r;
  }
  function probe(r) { var c = Math.cos(theta() / 2); return [c * r[0], c * r[1], r[2]]; }
  function pGuessProbe() { return (1 + Math.sin(theta() / 2)) / 2; }

  // Exact error and guessing probabilities in sifted rounds of basis B.
  // By symmetry it is enough to take Alice's bit 0.
  function exactBasis(B) {
    var a = AX[B];
    function err(r) { return (1 - dot(channel(r), a)) / 2; }
    if (eve === 'ir') {
      var errA = 0, gA = 0;
      ['Z', 'X'].forEach(function (E) {
        var e = AX[E], c = dot(a, e);
        [1, -1].forEach(function (s) { errA += 0.5 * (1 + s * c) / 2 * err([s * e[0], s * e[1], s * e[2]]); });
        gA += 0.5 * (E === B ? 1 : 0.5);
      });
      return { err: frac() * errA + (1 - frac()) * err(a), guess: frac() * gA + (1 - frac()) * 0.5 };
    }
    if (eve === 'probe') return { err: err(probe(a)), guess: B === 'Z' ? pGuessProbe() : 0.5 };
    return { err: err(a), guess: 0.5 };
  }
  function exact() {
    var z = exactBasis('Z'), x = exactBasis('X');
    return { QZ: z.err, QX: x.err, Q: (z.err + x.err) / 2, gZ: z.guess, gX: x.guess, g: (z.guess + x.guess) / 2 };
  }

  // One round of the protocol.
  function round() {
    var b = rbit(), B = rbit() ? 'X' : 'Z';
    var a = AX[B].map(function (v) { return b ? -v : v; });
    var state = a, ev = null, guess = rbit();
    if (eve === 'ir' && Math.random() < frac()) {
      var E = rbit() ? 'X' : 'Z', e = AX[E];
      var s = Math.random() < (1 + dot(a, e)) / 2 ? 1 : -1;
      state = e.map(function (v) { return s * v; });
      ev = { E: E, bit: s > 0 ? 0 : 1 };
      // After the bases are announced Eve knows b if her basis matched; otherwise she guesses.
      guess = E === B ? ev.bit : rbit();
    } else if (eve === 'probe') {
      state = probe(a);
      ev = { probe: true };
      if (B === 'Z') guess = Math.random() < pGuessProbe() ? b : 1 - b;
    }
    state = channel(state);
    var Bp = rbit() ? 'X' : 'Z';
    var out = Math.random() < (1 + dot(state, AX[Bp])) / 2 ? 0 : 1;
    return { b: b, B: B, ev: ev, Bp: Bp, out: out, sifted: Bp === B, guess: guess };
  }

  /* ---------- round-by-round table ---------- */
  function roundsHTML(R) {
    function row(head, cells) { return '<tr><th>' + head + '</th>' + cells.join('') + '</tr>'; }
    function td(content, cls) { return '<td' + (cls ? ' class="' + cls + '"' : '') + '>' + content + '</td>'; }
    var rows = [
      row('Alice\'s bit ' + m('b_i'), R.map(function (x) { return td(m(String(x.b))); })),
      row('Alice\'s basis ' + m('\\beta_i'), R.map(function (x) { return td(m(x.B)); })),
      row('State sent', R.map(function (x) { return td(m(KET[x.B + x.b])); }))
    ];
    if (eve === 'ir') {
      rows.push(row('Eve resends', R.map(function (x) { return x.ev ? td(m(KET[x.ev.E + x.ev.bit])) : td('\u2013', 'off'); })));
    } else if (eve === 'probe') {
      rows.push('<tr><th>Eve</th><td colspan="' + R.length + '" style="text-align:left">probe attached to every qubit</td></tr>');
    }
    rows.push(row('Bob\'s basis ' + m('\\beta_i\'') , R.map(function (x) { return td(m(x.Bp)); })));
    rows.push(row('Bob\'s bit', R.map(function (x) { return td(m(String(x.out)), x.sifted ? '' : 'off'); })));
    rows.push(row('Sifted?', R.map(function (x) { return td(x.sifted ? '\u2713' : '\u2717', x.sifted ? '' : 'off'); })));
    rows.push(row('Error?', R.map(function (x) {
      if (!x.sifted) return td('', 'off');
      return x.out !== x.b ? td('\u2717', 'err') : td('\u2013');
    })));

    var sifted = R.filter(function (x) { return x.sifted; });
    var errs = sifted.filter(function (x) { return x.out !== x.b; }).length;
    function key(field) {
      return sifted.map(function (x) { var v = x[field]; return x.out !== x.b ? '<span class="err">' + v + '</span>' : String(v); }).join(' ');
    }
    return '<table class="rounds-table"><tbody>' + rows.join('') + '</tbody></table>' +
      '<p class="sim-readout" style="margin-top:0.7rem;">Sifted key, Alice: <span class="key-line">' + (key('b') || '\u2013') + '</span><br>' +
      'Sifted key, Bob: &nbsp;&nbsp;<span class="key-line">' + (key('out') || '\u2013') + '</span></p>' +
      '<p class="sim-note">' + sifted.length + ' of ' + R.length + ' rounds survive sifting; ' + errs + ' of them ' + (errs === 1 ? 'is an error' : 'are errors') + ' (red).</p>';
  }

  /* ---------- statistics ---------- */
  function statsHTML() {
    var X = exact(), S = lastRun;
    function sim(v) { return S ? num(v) : '\u2013'; }
    var rows = [
      ['Fraction of rounds sifted', S ? S.nS / S.n : 0, 0.5],
      [m('Q_Z') + ', error rate in the ' + m('Z') + ' basis', S ? S.eZ / S.nZ : 0, X.QZ],
      [m('Q_X') + ', error rate in the ' + m('X') + ' basis', S ? S.eX / S.nX : 0, X.QX],
      [m('Q') + ', both bases', S ? (S.eZ + S.eX) / S.nS : 0, X.Q],
      ['Eve guesses a ' + m('Z') + '-basis bit', S ? S.gZ / S.nZ : 0, X.gZ],
      ['Eve guesses an ' + m('X') + '-basis bit', S ? S.gX / S.nX : 0, X.gX],
      ['Eve guesses a sifted bit, both bases', S ? (S.gZ + S.gX) / S.nS : 0, X.g],
      [m('r = 1 - 2h(Q)'), S ? keyRate((S.eZ + S.eX) / S.nS) : 0, keyRate(X.Q)]
    ].map(function (r) { return '<tr><td>' + r[0] + '</td><td>' + sim(r[1]) + '</td><td>' + num(r[2]) + '</td></tr>'; }).join('');
    var verdict = keyRate(X.Q) > 0
      ? 'With these settings ' + m('Q = ' + (X.Q * 100).toFixed(1) + '\\%') + ' is below ' + m((QSTAR * 100).toFixed(1) + '\\%') +
        ': Alice and Bob distill a key at rate ' + m('r = ' + keyRate(X.Q).toFixed(3)) + ' per sifted bit.'
      : 'With these settings ' + m('Q = ' + (X.Q * 100).toFixed(1) + '\\%') + ' is above ' + m((QSTAR * 100).toFixed(1) + '\\%') +
        ': Alice and Bob abort.';
    return '<table class="sim-table"><thead><tr><th></th><th>Simulated</th><th>Exact</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p class="sim-readout" style="margin-top:0.7rem;">' + verdict + '</p>' +
      '<p class="sim-note">The black dot on the first chart is at (' + m('Q_X') + ', Eve guesses a ' + m('Z') + '-basis bit).' +
      (S ? ' Simulated column: ' + S.n + ' rounds, ' + S.nS + ' of them sifted.' : '') + '</p>';
  }

  /* ---------- charts ---------- */
  var cssVars = getComputedStyle(document.documentElement);
  function cssColor(name, fallback) { return cssVars.getPropertyValue(name).trim() || fallback; }
  var C = {
    accent: cssColor('--color-accent', '#1f3a5f'),
    orange: cssColor('--sim-measure', '#b4532a'),
    text: cssColor('--color-text', '#202329'),
    muted: cssColor('--color-text-muted', '#5c6470'),
    border: cssColor('--color-border', '#e3e0d8')
  };
  var M = { l: 46, r: 14, t: 26, b: 42 };   // plot margins in CSS pixels

  function Chart(id, cfg) {
    this.cv = $(id);
    this.ctx = this.cv.getContext('2d');
    this.labels = SimTeX.overlay(this.cv);
    this.cfg = cfg;
    this.W = 0; this.H = 0;
  }
  Chart.prototype.resize = function () {
    var w = this.cv.clientWidth;
    if (!w) return false;
    var h = w / 1.45, dpr = window.devicePixelRatio || 1;
    this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.W = w; this.H = h;
    return true;
  };
  Chart.prototype.px = function (x) { var c = this.cfg; return M.l + (x - c.x0) / (c.x1 - c.x0) * (this.W - M.l - M.r); };
  Chart.prototype.py = function (y) { var c = this.cfg; return this.H - M.b - (y - c.y0) / (c.y1 - c.y0) * (this.H - M.t - M.b); };
  Chart.prototype.frame = function () {
    var c = this.cfg, ctx = this.ctx, self = this;
    ctx.clearRect(0, 0, this.W, this.H);
    ctx.strokeStyle = C.border; ctx.lineWidth = 1;
    c.xt.forEach(function (x, i) {
      var X = self.px(x);
      ctx.beginPath(); ctx.moveTo(X, self.py(c.y0)); ctx.lineTo(X, self.py(c.y1)); ctx.stroke();
      self.labels.set('xt' + i, c.fx(x), X, self.H - M.b + 13, C.muted, 1, 'small');
    });
    c.yt.forEach(function (y, i) {
      var Y = self.py(y);
      ctx.beginPath(); ctx.moveTo(self.px(c.x0), Y); ctx.lineTo(self.px(c.x1), Y); ctx.stroke();
      self.labels.set('yt' + i, c.fy(y), M.l - 6, Y, C.muted, 1, 'small right');
    });
    ctx.strokeStyle = C.muted;
    ctx.beginPath(); ctx.moveTo(this.px(c.x0), this.py(c.y1)); ctx.lineTo(this.px(c.x0), this.py(c.y0)); ctx.lineTo(this.px(c.x1), this.py(c.y0)); ctx.stroke();
    this.labels.set('xl', c.xl, (M.l + this.W - M.r) / 2, this.H - 10, C.text, 1, 'small');
    this.labels.set('yl', c.yl, M.l - 6, M.t - 14, C.text, 1, 'small left');
  };
  Chart.prototype.curve = function (f, a, b, color, width, dash) {
    var ctx = this.ctx, c = this.cfg;
    ctx.save();
    ctx.beginPath();   // clip to the plot area
    ctx.rect(this.px(c.x0), this.py(c.y1), this.px(c.x1) - this.px(c.x0), this.py(c.y0) - this.py(c.y1));
    ctx.clip();
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash || []);
    ctx.beginPath();
    for (var i = 0; i <= 200; i++) {
      var x = a + (b - a) * i / 200, X = this.px(x), Y = this.py(f(x));
      if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y);
    }
    ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  };
  Chart.prototype.dot = function (x, y) {
    var ctx = this.ctx, X = this.px(x), Y = this.py(y);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X, Y, 7, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = C.text; ctx.beginPath(); ctx.arc(X, Y, 5, 0, 2 * Math.PI); ctx.fill();
  };

  var infoChart = new Chart('chart-info', {
    x0: 0, x1: 0.5, y0: 0.5, y1: 1,
    xt: [0, 0.1, 0.2, 0.3, 0.4, 0.5], yt: [0.5, 0.6, 0.7, 0.8, 0.9, 1],
    fx: function (x) { return x.toFixed(1); }, fy: function (y) { return y.toFixed(1); },
    xl: 'e', yl: 'P_{\\text{guess}}'
  });
  var keyChart = new Chart('chart-key', {
    x0: 0, x1: 0.25, y0: -0.5, y1: 1,
    xt: [0, 0.05, 0.1, 0.15, 0.2, 0.25], yt: [-0.5, 0, 0.5, 1],
    fx: function (x) { return x.toFixed(2); }, fy: function (y) { return y.toFixed(1); },
    xl: 'Q', yl: 'r'
  });

  function drawInfo() {
    var ch = infoChart;
    if (!ch.W) return;
    ch.frame();
    ch.curve(function (e) { return 0.5 + e; }, 0, 0.25, C.orange, 2.2);
    ch.curve(function (e) { return 0.5 + Math.sqrt(e * (1 - e)); }, 0, 0.5, C.accent, 2.2);
    ch.labels.set('l-ir', '\\text{intercept and resend}', ch.px(0.255) + 4, ch.py(0.735), C.orange, 1, 'small left');
    ch.labels.set('l-pr', '\\text{probe}', ch.px(0.06) - 6, ch.py(0.5 + Math.sqrt(0.06 * 0.94)) - 4, C.accent, 1, 'small right');
    var X = exact();
    ch.dot(Math.min(X.QX, 0.5), Math.max(0.5, Math.min(X.gZ, 1)));
  }
  function drawKey() {
    var ch = keyChart;
    if (!ch.W) return;
    ch.frame();
    var ctx = ch.ctx;
    ctx.strokeStyle = C.text; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(ch.px(0), ch.py(0)); ctx.lineTo(ch.px(0.25), ch.py(0)); ctx.stroke();
    ctx.strokeStyle = C.orange; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(ch.px(QSTAR), ch.py(-0.5)); ctx.lineTo(ch.px(QSTAR), ch.py(1)); ctx.stroke();
    ctx.setLineDash([]);
    ch.labels.set('l-q', 'Q \\approx ' + (QSTAR * 100).toFixed(1) + '\\%', ch.px(QSTAR) + 5, ch.py(0.85), C.orange, 1, 'small left');
    ch.curve(keyRate, 0, 0.25, C.accent, 2.2);
    // Current point; pinned to the plot edge (with its values) when it falls outside.
    var Q = exact().Q, r = keyRate(Q);
    var x = Math.min(Q, 0.25), y = Math.max(r, -0.5);
    ch.dot(x, y);
    if (x !== Q || y !== r) {
      ch.labels.set('l-off', 'Q = ' + Q.toFixed(3) + ',\ r = ' + r.toFixed(3), ch.px(x) - 4, ch.py(0.25), C.text, 1, 'small right');
    } else ch.labels.hide('l-off');
  }
  function drawCharts() { drawInfo(); drawKey(); }
  function resize() { infoChart.resize(); keyChart.resize(); drawCharts(); }

  /* ---------- controls ---------- */
  var NOISE_NOTE = {
    dephasing: m('Z') + '-basis states pass unchanged; the ' + m('X') + ' and ' + m('Y') + ' components of the Bloch vector are multiplied by ' + m('1 - 2p') + '.',
    depolarizing: 'With probability ' + m('p') + ' the qubit is replaced by ' + m('\\pi = I/2') + ', so ' + m('\\vec r \\to (1-p)\\,\\vec r') + '.'
  };
  function syncOutputs() {
    $('frac-out').textContent = frac().toFixed(2);
    $('theta-out').textContent = $('theta').value + '\u00B0';
    $('p-out').textContent = pnoise().toFixed(3);
    $('noise-note').innerHTML = NOISE_NOTE[noise] || '';
  }
  function refresh() {
    syncOutputs();
    $('stats').innerHTML = statsHTML();
    drawCharts();
  }
  // Rounds and counts from earlier settings no longer apply.
  function changed() {
    lastRun = null;
    $('rounds').innerHTML = '';
    refresh();
  }

  ['frac', 'theta', 'p'].forEach(function (id) { $(id).addEventListener('input', changed); });

  function group(attr, setter) {
    document.querySelectorAll('[' + attr + ']').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('[' + attr + ']').forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        setter(b.getAttribute(attr));
        changed();
      });
    });
  }
  group('data-eve', function (v) {
    eve = v;
    $('ir-controls').classList.toggle('sim-hidden', v !== 'ir');
    $('probe-controls').classList.toggle('sim-hidden', v !== 'probe');
  });
  group('data-noise', function (v) {
    noise = v;
    $('noise-controls').classList.toggle('sim-hidden', v === 'none');
  });

  $('send').addEventListener('click', function () {
    var R = [];
    for (var i = 0; i < N_SHOW; i++) R.push(round());
    $('rounds').innerHTML = roundsHTML(R);
  });

  $('run').addEventListener('click', function () {
    var n = +$('n').value, S = { n: n, nS: 0, nZ: 0, nX: 0, eZ: 0, eX: 0, gZ: 0, gX: 0 };
    for (var i = 0; i < n; i++) {
      var x = round();
      if (!x.sifted) continue;
      S.nS++;
      var bad = x.out !== x.b ? 1 : 0;
      if (x.B === 'Z') { S.nZ++; S.eZ += bad; } else { S.nX++; S.eX += bad; }
      if (x.guess === x.b) { if (x.B === 'Z') S.gZ++; else S.gX++; }
    }
    lastRun = S;
    $('stats').innerHTML = statsHTML();
  });

  window.addEventListener('resize', resize);
  SimTeX.renderIn(document.querySelector('main'));
  refresh();
  resize();
})();
