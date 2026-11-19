/* EE608, projective versus POVM, part 1: name a state that was not sent.
   Trine states |e_k> = cos(2 pi k/3)|0> + sin(2 pi k/3)|1> have Bloch vectors
   in the X-Z plane at angles 4 pi k/3 from Z (vectors are [x, z]).
   POVM: Lambda_k = (2/3)|e_k_perp><e_k_perp|, so P(j | k) = (1 - r_j.r_k)/3,
   which is 0 for j = k: naming |e_k> after outcome k always wins.
   Projective: n.sigma with n = (sin a, 0, cos a); after outcome s the best
   choice is the state with the smallest P(s | k) = (1 + s n.r_k)/2. */
(function () {
  'use strict';

  var m = SimTeX.tex;
  var MINUS = '−';
  var DEG = Math.PI / 180;
  var mode = 'proj';
  var score = { proj: { n: 0, w: 0 }, povm: { n: 0, w: 0 } };
  var logItems = [];
  var lastSent = null;

  var $ = function (id) { return document.getElementById(id); };
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1]; }
  function num(x, d) {
    d = d === undefined ? 3 : d;
    if (Math.abs(x) < 0.5 * Math.pow(10, -d)) x = 0;
    return (x < 0 ? MINUS : '') + Math.abs(x).toFixed(d);
  }

  var STATES = [0, 1, 2].map(function (k) { var b = 4 * Math.PI * k / 3; return [Math.sin(b), Math.cos(b)]; });
  function ket(k) { return '\\ket{e_' + k + '}'; }

  /* ---------- the two measurements ---------- */
  function alpha() { return +$('el-alpha').value; }
  function axis() { var a = alpha() * DEG; return [Math.sin(a), Math.cos(a)]; }

  // Outcomes with their probabilities given each state, and the state named for each outcome.
  function measurement() {
    if (mode === 'povm') {
      return [0, 1, 2].map(function (j) {
        return { label: '\\Lambda_' + j, p: STATES.map(function (r) { return (1 - dot(STATES[j], r)) / 3; }), name: j };
      });
    }
    var n = axis();
    return [1, -1].map(function (s) {
      var p = STATES.map(function (r) { return (1 + s * dot(n, r)) / 2; });
      var best = 0;
      p.forEach(function (v, k) { if (v < p[best] - 1e-12) best = k; });
      return { label: s > 0 ? '+1' : '-1', p: p, name: best };
    });
  }
  function winProb(M) {
    return 1 - M.reduce(function (s, o) { return s + o.p[o.name]; }, 0) / 3;
  }
  function playRound(M) {
    var k = Math.floor(Math.random() * 3), u = Math.random(), acc = 0, j = 0;
    for (; j < M.length - 1; j++) { acc += M[j].p[k]; if (u < acc) break; }
    return { sent: k, out: j, named: M[j].name, win: M[j].name !== k };
  }

  /* ---------- readouts ---------- */
  function tableHTML() {
    var M = measurement();
    var head = '<tr><th>Outcome</th>' + [0, 1, 2].map(function (k) { return '<th>' + m('P(\\,\\cdot\\mid e_' + k + ')') + '</th>'; }).join('') + '<th>You name</th></tr>';
    var rows = M.map(function (o) {
      return '<tr><td>' + m(o.label) + '</td>' + o.p.map(function (v, k) {
        return '<td' + (k === o.name ? ' style="font-weight:600"' : '') + '>' + num(v) + '</td>';
      }).join('') + '<td>' + m(ket(o.name)) + '</td></tr>';
    }).join('');
    var W = winProb(M);
    return '<table class="sim-table" style="margin-top:0.6rem;"><thead>' + head + '</thead><tbody>' + rows + '</tbody></table>' +
      '<p class="sim-readout" style="margin-top:0.6rem;">You lose only when Bob sent the state you name (bold entries):<br>' +
      m('P(\\text{win}) = 1 - \\tfrac13\\textstyle\\sum_{\\text{outcomes}} P(\\text{outcome}\\mid\\text{named state}) = ' + W.toFixed(3)) + '</p>';
  }
  function scoreHTML() {
    var rows = [['proj', 'Projective'], ['povm', 'POVM']].map(function (r) {
      var s = score[r[0]];
      return '<tr' + (r[0] === mode ? ' style="font-weight:600"' : '') + '><td>' + r[1] + '</td><td>' + s.n + '</td><td>' + s.w + '</td><td>' + (s.n ? num(s.w / s.n) : '–') + '</td></tr>';
    }).join('');
    return '<table class="sim-table"><thead><tr><th></th><th>Rounds</th><th>Wins</th><th>Win rate</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p class="sim-note">The projective score restarts when you turn the axis.</p>';
  }
  function log(html) {
    logItems.unshift(html);
    logItems = logItems.slice(0, 6);
    $('el-log').innerHTML = logItems.map(function (t) { return '<li>' + t + '</li>'; }).join('');
  }

  /* ---------- drawing ---------- */
  var canvas = $('el-disk');
  var ctx = canvas.getContext('2d');
  var labels = SimTeX.overlay(canvas);
  var cx = 0, cy = 0, R = 0;
  var cssVars = getComputedStyle(document.documentElement);
  function cssColor(name, fallback) { return cssVars.getPropertyValue(name).trim() || fallback; }
  var C = {
    discFill: cssColor('--sim-disc-fill', 'transparent'),
    sphereLine: cssColor('--sim-sphere-line', '#5c6470'),
    state: cssColor('--color-accent', '#1f3a5f'),
    meas: cssColor('--sim-measure', '#b4532a'),
    text: cssColor('--color-text', '#202329'),
    muted: cssColor('--color-text-muted', '#5c6470'),
    border: cssColor('--color-border', '#e3e0d8')
  };
  function pt(v, s) { s = s === undefined ? 1 : s; return { x: cx + R * s * v[0], y: cy - R * s * v[1] }; }
  function arrow(v, color, width) {
    var o = pt([0, 0]), t = pt(v), dx = t.x - o.x, dy = t.y - o.y, L = Math.hypot(dx, dy);
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(t.x, t.y); ctx.stroke();
    if (L < 12) return;
    var ux = dx / L, uy = dy / L, s = 11, w = 0.45;
    ctx.beginPath(); ctx.moveTo(t.x, t.y);
    ctx.lineTo(t.x - s * ux + s * w * uy, t.y - s * uy - s * w * ux);
    ctx.lineTo(t.x - s * ux - s * w * uy, t.y - s * uy + s * w * ux);
    ctx.closePath(); ctx.fill();
  }
  // Label beside an arrow: a fraction `along` of the way out, shifted sideways by px pixels.
  function sideLabel(key, tex, v, along, px, color) {
    var L = Math.hypot(v[0], v[1]), u = [v[0] / L, v[1] / L], b = pt(u, along * L);
    labels.set(key, tex, b.x + px * u[1], b.y + px * u[0], color);
  }

  function draw() {
    if (!R) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = C.discFill; ctx.strokeStyle = C.sphereLine; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = C.border; ctx.lineWidth = 1;
    [[0, 1], [1, 0]].forEach(function (v) {
      var p = pt(v, 1.08), q = pt([-v[0], -v[1]], 1.08);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
    });
    [['k0', [0, 1], '\\ket{0}'], ['k1', [0, -1], '\\ket{1}'], ['kp', [1, 0], '\\ket{+}'], ['km', [-1, 0], '\\ket{-}']].forEach(function (L) {
      var p = pt(L[1], 1.2);
      labels.set(L[0], L[2], p.x, p.y, C.muted, 0.8);
    });

    if (mode === 'proj') {
      var n = axis(), a1 = pt(n), a2 = pt([-n[0], -n[1]]);
      ctx.strokeStyle = C.meas; ctx.lineWidth = 2.2; ctx.setLineDash([7, 5]);
      ctx.beginPath(); ctx.moveTo(a2.x, a2.y); ctx.lineTo(a1.x, a1.y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.meas;
      [a1, a2].forEach(function (p) { ctx.beginPath(); ctx.arc(p.x, p.y, 5.5, 0, 2 * Math.PI); ctx.fill(); });
      sideLabel('m+', '+1', n, 0.84, -15, C.meas);
      sideLabel('m-', '-1', [-n[0], -n[1]], 0.84, 15, C.meas);
      [0, 1, 2].forEach(function (k) { labels.hide('L' + k); });
    } else {
      labels.hide('m+'); labels.hide('m-');
      STATES.forEach(function (r, k) {
        var a = [-2 / 3 * r[0], -2 / 3 * r[1]];
        arrow(a, C.meas, 2.6);
        var L = pt([-r[0], -r[1]], 2 / 3 + 0.17);
        labels.set('L' + k, '\\Lambda_' + k, L.x, L.y, C.meas);
      });
    }

    STATES.forEach(function (r, k) {
      arrow(r, C.state, 2.6);
      sideLabel('s' + k, ket(k), r, 0.62, 18, C.state);
    });
    if (lastSent !== null) {
      var t = pt(STATES[lastSent]);
      ctx.strokeStyle = C.state; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(t.x, t.y, 9, 0, 2 * Math.PI); ctx.stroke();
    }
  }
  function resize() {
    var w = canvas.clientWidth;
    if (!w) return;
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(w * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = w / 2; cy = w / 2; R = w * 0.34;
    draw();
  }

  /* ---------- dragging the axis ---------- */
  var dragging = false;
  function local(e) { var b = canvas.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; }
  canvas.addEventListener('pointerdown', function (e) {
    if (mode !== 'proj') return;
    var p = local(e), n = axis(), a1 = pt(n), a2 = pt([-n[0], -n[1]]);
    if (Math.min(Math.hypot(p.x - a1.x, p.y - a1.y), Math.hypot(p.x - a2.x, p.y - a2.y)) < 24) {
      dragging = true; canvas.setPointerCapture(e.pointerId);
    }
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var p = local(e);
    var a = Math.atan2(p.x - cx, cy - p.y) / DEG;
    a = ((Math.round(a) % 180) + 180) % 180;
    var snap = Math.round(a / 15) * 15;
    if (Math.abs(a - snap) <= 2) a = snap % 180;
    if (+$('el-alpha').value !== a) { $('el-alpha').value = a; axisChanged(); }
  });
  ['pointerup', 'pointercancel'].forEach(function (t) { canvas.addEventListener(t, function () { dragging = false; }); });

  /* ---------- controls ---------- */
  function refresh() {
    $('el-alpha-out').textContent = alpha() + '°';
    $('el-table').innerHTML = tableHTML();
    $('el-score').innerHTML = scoreHTML();
    draw();
  }
  function axisChanged() { score.proj = { n: 0, w: 0 }; lastSent = null; refresh(); }
  $('el-alpha').addEventListener('input', axisChanged);

  document.querySelectorAll('[data-el-mode]').forEach(function (b) {
    b.addEventListener('click', function () {
      mode = b.getAttribute('data-el-mode');
      document.querySelectorAll('[data-el-mode]').forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
      $('el-proj-controls').classList.toggle('sim-hidden', mode !== 'proj');
      $('el-povm-controls').classList.toggle('sim-hidden', mode !== 'povm');
      lastSent = null;
      refresh();
    });
  });

  $('el-one').addEventListener('click', function () {
    var M = measurement(), r = playRound(M), s = score[mode];
    s.n++; if (r.win) s.w++;
    lastSent = r.sent;
    log('Bob sent ' + m(ket(r.sent)) + '. Outcome ' + m(M[r.out].label) + '. You name ' + m(ket(r.named)) + ': ' +
      (r.win ? '<span class="sim-win">win</span>' : '<span class="sim-loss">loss</span>, Bob sent that state') + '.');
    refresh();
  });
  $('el-many').addEventListener('click', function () {
    var M = measurement(), n = +$('el-n').value, s = score[mode];
    for (var i = 0; i < n; i++) { s.n++; if (playRound(M).win) s.w++; }
    lastSent = null;
    refresh();
  });
  $('el-reset').addEventListener('click', function () {
    score = { proj: { n: 0, w: 0 }, povm: { n: 0, w: 0 } };
    logItems = []; $('el-log').innerHTML = ''; lastSent = null;
    refresh();
  });

  window.addEventListener('resize', resize);
  refresh();
  resize();
})();
