/* EE608, projective versus POVM, part 2: find the hidden state.
   Hidden state: a random pure qubit state with Bloch vector r.
   Projective data: measuring sigma_i gives +1 with probability (1 + r_i)/2;
   the estimate of r_i is the mean outcome. Each measured axis confines a pure
   state to the circle {v : |v| = 1, v_i = estimate}.
   Tetrahedral POVM: Lambda_j = |t_j><t_j|/2 with Bloch vectors n_j at the
   corners of a regular tetrahedron; P(j) = (1 + r.n_j)/4 and r = 3 sum_j P(j) n_j.
   Error: trace distance (1/2)||rho_est - rho||_1 = |r_est - r|/2 (Lecture 9). */
(function () {
  'use strict';

  var m = SimTeX.tex;
  var MINUS = '−';
  var DEG = Math.PI / 180;
  var AXN = ['X', 'Y', 'Z'];
  var TH = Math.acos(-1 / 3);
  var TETRA = [[0, 0, 1]].concat([0, 120, 240].map(function (p) {
    return [Math.sin(TH) * Math.cos(p * DEG), Math.sin(TH) * Math.sin(p * DEG), Math.cos(TH)];
  }));

  var hidden, proj, povm, revealed;
  var view = { az: 30 * DEG, el: 20 * DEG };

  var $ = function (id) { return document.getElementById(id); };
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function len(a) { return Math.sqrt(dot(a, a)); }
  function scale(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
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

  /* ---------- state and data ---------- */
  function newHidden() {
    var z = 2 * Math.random() - 1, p = 2 * Math.PI * Math.random(), s = Math.sqrt(1 - z * z);
    hidden = [s * Math.cos(p), s * Math.sin(p), z];
    clearData();
  }
  // Forget all measurements and hide the state again; the hidden state is kept.
  function clearData() {
    proj = [{ n: 0, plus: 0 }, { n: 0, plus: 0 }, { n: 0, plus: 0 }];
    povm = { n: 0, c: [0, 0, 0, 0] };
    revealed = false;
  }
  function batch() { return +$('tm-batch').value; }
  function measureAxis(i) {
    var n = batch(), p = (1 + hidden[i]) / 2, plus = 0;
    for (var k = 0; k < n; k++) if (Math.random() < p) plus++;
    proj[i].n += n; proj[i].plus += plus;
  }
  function measurePovm() {
    var n = batch(), P = TETRA.map(function (t) { return (1 + dot(hidden, t)) / 4; });
    for (var k = 0; k < n; k++) {
      var u = Math.random(), acc = 0, j = 0;
      for (; j < 3; j++) { acc += P[j]; if (u < acc) break; }
      povm.c[j]++;
    }
    povm.n += n;
  }

  function projEst(i) { return proj[i].n ? (2 * proj[i].plus - proj[i].n) / proj[i].n : null; }
  function projVec() {
    var v = [0, 1, 2].map(projEst);
    return v.every(function (x) { return x !== null; }) ? v : null;
  }
  function povmVec() {
    if (!povm.n) return null;
    var r = [0, 0, 0];
    TETRA.forEach(function (t, j) { r = add(r, scale(t, 3 * povm.c[j] / povm.n)); });
    return r;
  }
  // Estimates outside the Bloch ball are scaled back to its surface.
  function physical(v) { var L = len(v); return L > 1 ? scale(v, 1 / L) : v; }
  function traceDist(v) { return len(add(physical(v), scale(hidden, -1))) / 2; }

  /* ---------- readout ---------- */
  function outHTML() {
    var settingsP = proj.filter(function (a) { return a.n > 0; }).length;
    var copiesP = proj.reduce(function (s, a) { return s + a.n; }, 0);
    var est = [0, 1, 2].map(projEst);
    var pv = projVec(), qv = povmVec();
    var projTeX = '(' + est.map(function (x) { return x === null ? '?' : tn(x); }).join(',\\ ') + ')';
    var qTeX = qv ? '(' + qv.map(function (x) { return tn(x); }).join(',\\ ') + ')' : null;
    // Short table for counts and errors; the estimate vectors go on their own lines below it.
    var rows =
      '<tr><td>Projective</td><td>' + copiesP + '</td><td>' + settingsP + '</td>' +
        (revealed ? '<td>' + (pv ? num(traceDist(pv)) : 'needs ' + m('X, Y, Z')) + '</td>' : '') + '</tr>' +
      '<tr><td>POVM</td><td>' + povm.n + '</td><td>' + (povm.n ? 1 : 0) + '</td>' +
        (revealed ? '<td>' + (qv ? num(traceDist(qv)) : '\u2013') + '</td>' : '') + '</tr>';
    var html = '<table class="sim-table"><thead><tr><th>Strategy</th><th>Copies</th><th>Settings</th>' +
      (revealed ? '<th>' + m('\\tfrac12\\lVert\\hat\\rho - \\rho\\rVert_1') + '</th>' : '') + '</tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p class="sim-readout" style="margin-top:0.6rem;">Projective estimate: ' + (copiesP ? m('\\hat r = ' + projTeX) : 'no data yet') + '<br>' +
      'POVM estimate: ' + (qTeX ? m('\\hat r = ' + qTeX) : 'no data yet') + '</p>';
    var known = est.map(function (x, i) { return x === null ? null : AXN[i]; }).filter(Boolean);
    if (copiesP && !pv) {
      html += '<p class="sim-readout" style="margin-top:0.6rem;">So far you know only ' + known.map(function (a) { return m('r_' + a.toLowerCase()); }).join(' and ') +
        '. Every pure state ' + (known.length > 1 ? 'where the dashed circles cross' : 'on the dashed circle') + ' has ' + (known.length > 1 ? 'these values' : 'this value') + '.</p>';
    }
    if (revealed) {
      html += '<p class="sim-readout" style="margin-top:0.6rem;">Hidden state: ' + m('\\vec r = (' + hidden.map(function (x) { return tn(x); }).join(',\\ ') + ')') +
        '. The trace distance uses ' + m('\\tfrac12\\lVert\\hat\\rho - \\rho\\rVert_1 = \\tfrac12\\lVert\\hat r - \\vec r\\rVert') +
        ' (Lecture 9); an estimate outside the Bloch ball is first scaled back to its surface.</p>';
    }
    return html;
  }

  /* ---------- drawing ---------- */
  var canvas = $('tm-bloch');
  var ctx = canvas.getContext('2d');
  var labels = SimTeX.overlay(canvas);
  var cx = 0, cy = 0, R = 0;
  var cssVars = getComputedStyle(document.documentElement);
  function cssColor(name, fallback) { return cssVars.getPropertyValue(name).trim() || fallback; }
  var C = {
    povm: cssColor('--color-accent', '#1f3a5f'),
    proj: cssColor('--sim-measure', '#b4532a'),
    text: cssColor('--color-text', '#202329'),
    muted: cssColor('--color-text-muted', '#5c6470'),
    border: cssColor('--color-border', '#e3e0d8')
  };
  function camera() {
    var ca = Math.cos(view.az), sa = Math.sin(view.az), ce = Math.cos(view.el), se = Math.sin(view.el);
    return { right: [-sa, ca, 0], up: [-se * ca, -se * sa, ce], fwd: [ce * ca, ce * sa, se] };
  }
  function proj3(p, cam) { return { x: cx + R * dot(p, cam.right), y: cy - R * dot(p, cam.up), d: dot(p, cam.fwd) }; }
  function curve(fn, cam, front) {
    ctx.beginPath();
    var pen = false;
    for (var i = 0; i <= 144; i++) {
      var q = proj3(fn(i / 144 * 2 * Math.PI), cam);
      if ((q.d >= 0) === front) { if (pen) ctx.lineTo(q.x, q.y); else { ctx.moveTo(q.x, q.y); pen = true; } } else pen = false;
    }
    ctx.stroke();
  }
  var CIRCLES = [
    function (t) { return [Math.cos(t), Math.sin(t), 0]; },
    function (t) { return [Math.sin(t), 0, Math.cos(t)]; },
    function (t) { return [0, Math.sin(t), Math.cos(t)]; }
  ];
  var AXES = [
    { key: 'z', v: [0, 0, 1], plus: '\\ket{0}', minus: '\\ket{1}' },
    { key: 'x', v: [1, 0, 0], plus: '\\ket{+}', minus: '\\ket{-}' },
    { key: 'y', v: [0, 1, 0], plus: '\\ket{\\iotap}', minus: '\\ket{\\iotam}' }
  ];
  function line(a, b, color, width, dash) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash || []);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
  }
  function arrow(from, to, color, width) {
    line(from, to, color, width);
    var dx = to.x - from.x, dy = to.y - from.y, L = Math.hypot(dx, dy);
    if (L < 14) return;
    var ux = dx / L, uy = dy / L, s = 10, w = 0.42;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - s * ux + s * w * uy, to.y - s * uy - s * w * ux);
    ctx.lineTo(to.x - s * ux - s * w * uy, to.y - s * uy + s * w * ux);
    ctx.closePath(); ctx.fill();
  }
  // Circle of pure states with component i equal to c.
  function stateCircle(i, c) {
    var cc = Math.max(-1, Math.min(1, c)), rad = Math.sqrt(1 - cc * cc);
    var e = [0, 0, 0]; e[i] = 1;
    var u = [0, 0, 0], v = [0, 0, 0]; u[(i + 1) % 3] = 1; v[(i + 2) % 3] = 1;
    return function (t) { return add(scale(e, cc), add(scale(u, rad * Math.cos(t)), scale(v, rad * Math.sin(t)))); };
  }
  function vecLabel(key, tex, v, cam, color, dx, dy) {
    var L = len(v), q = proj3(L > 1e-6 ? scale(v, (L + 0.14) / L) : [0, 0, 0], cam);
    labels.set(key, tex, q.x + (dx || 0), q.y + (dy || 0), color);
  }

  function draw() {
    if (!R) return;
    var cam = camera(), O = proj3([0, 0, 0], cam);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 1; ctx.strokeStyle = C.border; ctx.setLineDash([4, 4]);
    CIRCLES.forEach(function (f) { curve(f, cam, false); });
    ctx.setLineDash([]);
    AXES.forEach(function (ax) {
      [1, -1].forEach(function (s) { var t = scale(ax.v, s); if (dot(t, cam.fwd) < 0) line(O, proj3(scale(t, 1.12), cam), C.muted, 1, [3, 4]); });
    });
    var g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
    g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(226,222,212,0.55)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = C.muted;
    CIRCLES.forEach(function (f) { curve(f, cam, true); });
    AXES.forEach(function (ax) {
      [1, -1].forEach(function (s) {
        var t = scale(ax.v, s), front = dot(t, cam.fwd) >= 0;
        if (front) line(O, proj3(scale(t, 1.12), cam), C.text, 1.1);
        var p = proj3(scale(t, 1.28), cam);
        labels.set(ax.key + s, s > 0 ? ax.plus : ax.minus, p.x, p.y, front ? C.text : C.muted, front ? 0.9 : 0.6);
      });
    });

    // Tetrahedron directions, faint.
    TETRA.forEach(function (t) { line(O, proj3(t, cam), C.povm, 1, [2, 4]); });

    // Circles allowed by the projective data.
    [0, 1, 2].forEach(function (i) {
      var c = projEst(i);
      if (c === null) return;
      var f = stateCircle(i, c);
      ctx.strokeStyle = C.proj; ctx.lineWidth = 1.8;
      ctx.setLineDash([6, 4]); curve(f, cam, true);
      ctx.globalAlpha = 0.4; curve(f, cam, false); ctx.globalAlpha = 1;
      ctx.setLineDash([]);
    });

    var pv = projVec(), qv = povmVec();
    if (pv) { arrow(O, proj3(pv, cam), C.proj, 2.6); vecLabel('lp', '\\hat r_{\\text{proj}}', pv, cam, C.proj, 0, -4); } else labels.hide('lp');
    if (qv) { arrow(O, proj3(qv, cam), C.povm, 2.6); vecLabel('lq', '\\hat r_{\\text{POVM}}', qv, cam, C.povm, 0, 14); } else labels.hide('lq');
    if (revealed) { arrow(O, proj3(hidden, cam), C.text, 2.6); vecLabel('lh', '\\vec r', hidden, cam, C.text, 14, 0); } else labels.hide('lh');
  }
  function resize() {
    var w = canvas.clientWidth;
    if (!w) return;
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(w * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = w / 2; cy = w / 2; R = w * 0.35;
    draw();
  }

  var drag = null;
  canvas.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, az: view.az, el: view.el }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', function (e) {
    if (!drag) return;
    view.az = drag.az - (e.clientX - drag.x) * 0.01;
    view.el = Math.max(-80 * DEG, Math.min(80 * DEG, drag.el + (e.clientY - drag.y) * 0.01));
    draw();
  });
  ['pointerup', 'pointercancel'].forEach(function (t) { canvas.addEventListener(t, function () { drag = null; }); });
  $('tm-view-reset').addEventListener('click', function () { view.az = 30 * DEG; view.el = 20 * DEG; draw(); });

  /* ---------- controls ---------- */
  function refresh() { $('tm-out').innerHTML = outHTML(); draw(); }
  document.querySelectorAll('[data-tm-axis]').forEach(function (b) {
    b.addEventListener('click', function () { measureAxis(+b.getAttribute('data-tm-axis')); refresh(); });
  });
  $('tm-povm').addEventListener('click', function () { measurePovm(); refresh(); });
  $('tm-new').addEventListener('click', function () { newHidden(); refresh(); });
  $('tm-reveal').addEventListener('click', function () { revealed = true; refresh(); });
  $('tm-restart').addEventListener('click', function () { clearData(); refresh(); });

  newHidden();
  window.addEventListener('resize', resize);
  refresh();
  resize();
})();
