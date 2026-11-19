/* EE608 Simulation 1: qubit states and measurement.
   The state is stored as its Bloch vector r = (rx, ry, rz) with ||r|| <= 1, so
   rho = (I + rx X + ry Y + rz Z) / 2 (Lecture 8). Measuring n.sigma gives +1
   with probability (1 + r.n) / 2. Rotation gates use the course convention
   R_n(phi) = exp(+i phi n.sigma / 2), which turns r by -phi about n.
   Math is typeset with KaTeX through SimTeX (sim-tex.js). */
(function () {
  'use strict';

  var DEG = Math.PI / 180;
  var MINUS = '−';
  var m = SimTeX.tex;   // TeX string -> HTML

  var r = [0, 0, 1];
  var view = { az: 30 * DEG, el: 20 * DEG };
  var axisName = 'Z';
  var anim = null;
  var logItems = [];

  var $ = function (id) { return document.getElementById(id); };

  /* ---------- vector helpers ---------- */
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function len(a) { return Math.sqrt(dot(a, a)); }
  function scale(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
  function clamp(x, lo, hi) { return Math.min(hi, Math.max(lo, x)); }
  function polar(l, thDeg, phDeg) {
    var t = thDeg * DEG, p = phDeg * DEG;
    return [l * Math.sin(t) * Math.cos(p), l * Math.sin(t) * Math.sin(p), l * Math.cos(t)];
  }
  // Rodrigues' formula: turn v by angle a (radians) about the unit axis n.
  function rotate(v, n, a) {
    var c = Math.cos(a), s = Math.sin(a), d = dot(n, v);
    var x = [n[1] * v[2] - n[2] * v[1], n[2] * v[0] - n[0] * v[2], n[0] * v[1] - n[1] * v[0]];
    return [0, 1, 2].map(function (i) { return v[i] * c + x[i] * s + n[i] * d * (1 - c); });
  }

  /* ---------- numbers ---------- */
  // For plain text (Unicode minus).
  function num(x, d) {
    d = d === undefined ? 3 : d;
    if (Math.abs(x) < 0.5 * Math.pow(10, -d)) x = 0;
    return (x < 0 ? MINUS : '') + Math.abs(x).toFixed(d);
  }
  // For TeX (ASCII minus; KaTeX typesets it).
  function tn(x, d) {
    d = d === undefined ? 3 : d;
    if (Math.abs(x) < 0.5 * Math.pow(10, -d)) x = 0;
    return (x < 0 ? '-' : '') + Math.abs(x).toFixed(d);
  }
  function tc(re, im) {
    if (Math.abs(im) < 5e-4) return tn(re);
    if (Math.abs(re) < 5e-4) return tn(im) + 'i';
    return tn(re) + (im < 0 ? ' - ' : ' + ') + tn(Math.abs(im)) + 'i';
  }
  function vec(v) { return '(' + tn(v[0]) + ',\\ ' + tn(v[1]) + ',\\ ' + tn(v[2]) + ')'; }

  /* ---------- named states (TeX) ---------- */
  var NAMED = [
    { v: [0, 0, 1], name: '\\ket{0}' }, { v: [0, 0, -1], name: '\\ket{1}' },
    { v: [1, 0, 0], name: '\\ket{+}' }, { v: [-1, 0, 0], name: '\\ket{-}' },
    { v: [0, 1, 0], name: '\\ket{\\iotap}' }, { v: [0, -1, 0], name: '\\ket{\\iotam}' }
  ];
  function nameOf(v) {
    if (len(v) < 1e-3) return '\\pi = I/2';
    for (var i = 0; i < NAMED.length; i++) {
      var d = [v[0] - NAMED[i].v[0], v[1] - NAMED[i].v[1], v[2] - NAMED[i].v[2]];
      if (len(d) < 2e-3) return NAMED[i].name;
    }
    return null;
  }

  /* ---------- measurement axis ---------- */
  function axisVec() {
    if (axisName === 'Z') return [0, 0, 1];
    if (axisName === 'X') return [1, 0, 0];
    if (axisName === 'Y') return [0, 1, 0];
    return polar(1, +$('m-theta').value, +$('m-phi').value);
  }
  function axisTeX() { return axisName === 'n' ? '\\hat n\\cdot\\vec\\sigma' : axisName; }
  function eigTeX(sign) {
    return nameOf(scale(axisVec(), sign)) || (sign > 0 ? '\\ket{+\\hat n}' : '\\ket{-\\hat n}');
  }

  /* ---------- readouts ---------- */
  function ketLine() {
    var l = len(r);
    if (l < 1e-3) return '<p>' + m('\\rho = \\pi = I/2') + ', the maximally mixed state.</p>';
    if (l < 0.9995) {
      return '<p>Mixed state with spectral decomposition ' +
        m('\\rho = ' + tn((1 + l) / 2) + '\\,\\ket{\\psi_+}\\!\\bra{\\psi_+} + ' + tn((1 - l) / 2) + '\\,\\ket{\\psi_-}\\!\\bra{\\psi_-}') +
        ', where ' + m('\\ket{\\psi_\\pm}') + ' are the pure states at ' + m('\\pm\\vec r/\\lVert\\vec r\\rVert') + '.</p>';
    }
    var th = Math.acos(clamp(r[2] / l, -1, 1));
    var a = Math.cos(th / 2), b = Math.sin(th / 2);
    var p = ((Math.round(Math.atan2(r[1], r[0]) / DEG) % 360) + 360) % 360;
    var ket;
    if (b < 5e-4) ket = '\\ket{0}';
    else if (a < 5e-4) ket = '\\ket{1}';
    else {
      var second;
      if (p === 0) second = ' + ' + tn(b);
      else if (p === 180) second = ' - ' + tn(b);
      else if (p === 90) second = ' + i\\,' + tn(b);
      else if (p === 270) second = ' - i\\,' + tn(b);
      else second = ' + e^{i\\,' + p + '^\\circ}\\,' + tn(b);
      ket = tn(a) + '\\ket{0}' + second + '\\ket{1}';
    }
    var named = nameOf(r);
    return '<p>' + m('\\ket{\\psi} = ' + ket + (named && named !== ket ? ' = ' + named : '')) + '</p>';
  }

  function stateHTML() {
    var x = r[0], y = r[1], z = r[2], l = len(r);
    var purity = (1 + l * l) / 2;
    return ketLine() +
      '<p>Bloch vector ' + m('\\vec r = ' + vec(r) + ',\\quad \\lVert\\vec r\\rVert = ' + tn(l)) + '</p>' +
      '<p>' + m('\\rho = \\begin{pmatrix} ' + tn((1 + z) / 2) + ' & ' + tc(x / 2, -y / 2) + ' \\\\ ' +
        tc(x / 2, y / 2) + ' & ' + tn((1 - z) / 2) + ' \\end{pmatrix}') + '</p>' +
      '<p>Purity ' + m('P(\\rho) = \\operatorname{Tr}\\rho^2 = \\tfrac12\\left(1 + \\lVert\\vec r\\rVert^2\\right) = ' + tn(purity)) +
        (purity > 0.9995 ? ' (pure).' : ' (mixed).') + '</p>' +
      '<p>Eigenvalues ' + m('\\tfrac12\\left(1 \\pm \\lVert\\vec r\\rVert\\right) = ' + tn((1 + l) / 2) + ',\\ ' + tn((1 - l) / 2)) + '</p>';
  }

  function measHTML() {
    var n = axisVec(), e = dot(r, n), A = axisTeX();
    var html = '';
    if (axisName === 'n') html += '<p>Axis ' + m('\\hat n = ' + vec(n)) + '</p>';
    html += '<p>Born rule: ' + m('P(\\pm 1) = \\tfrac12\\left(1 \\pm \\vec r\\cdot\\hat n\\right)') + '</p>' +
      '<p>Outcome ' + m('+1') + ': probability <strong>' + num((1 + e) / 2) + '</strong>, post-measurement state ' + m(eigTeX(1)) + '<br>' +
      'Outcome ' + m('-1') + ': probability <strong>' + num((1 - e) / 2) + '</strong>, post-measurement state ' + m(eigTeX(-1)) + '</p>' +
      '<p>' + m('\\langle ' + A + '\\rangle = \\vec r\\cdot\\hat n = ' + tn(e) + ',\\quad \\Delta(' + A + ') = \\sqrt{1 - \\langle ' + A + '\\rangle^2} = ' +
        tn(Math.sqrt(Math.max(0, 1 - e * e)))) + '</p>';
    return html;
  }

  function histHTML(N, plus) {
    var e = dot(r, axisVec());
    var pPlus = (1 + e) / 2;
    var minus = N - plus;
    function row(label, count, pred) {
      var f = count / N;
      return '<div class="bar-row"><span>' + m(label) + '</span><span class="bar"><span style="width:' + (f * 100).toFixed(1) +
        '%"></span><i style="left:' + (pred * 100).toFixed(1) + '%"></i></span><span>' + count + ' (' + num(f) + ')</span></div>';
    }
    return row('+1', plus, pPlus) + row('-1', minus, 1 - pPlus) +
      '<p class="sim-note">' + N + ' copies measured in ' + m(axisTeX()) + '. Sample mean ' + num((plus - minus) / N) +
      ', ' + m('\\langle ' + axisTeX() + '\\rangle = ' + tn(e)) + '. Black ticks: Born-rule probabilities.</p>';
  }

  /* ---------- logging ---------- */
  function log(html) {
    logItems.unshift(html);
    logItems = logItems.slice(0, 8);
    $('log').innerHTML = logItems.map(function (t) { return '<li>' + t + '</li>'; }).join('');
  }

  /* ---------- sliders <-> state ---------- */
  function syncSliders() {
    var l = len(r);
    $('len').value = l.toFixed(2);
    $('len-out').textContent = l.toFixed(2);
    if (l > 1e-6) {
      var th = Math.acos(clamp(r[2] / l, -1, 1)) / DEG;
      var ph = ((Math.atan2(r[1], r[0]) / DEG) % 360 + 360) % 360;
      if (th < 0.5 || th > 179.5) ph = +$('phi').value; // azimuth is undefined at the poles
      $('theta').value = Math.round(th);
      $('phi').value = Math.round(ph) % 360;
      $('theta-out').textContent = Math.round(th) + '°';
      $('phi-out').textContent = (Math.round(ph) % 360) + '°';
    }
  }
  function fromSliders() {
    r = polar(+$('len').value, +$('theta').value, +$('phi').value);
    $('theta-out').textContent = $('theta').value + '°';
    $('phi-out').textContent = $('phi').value + '°';
    $('len-out').textContent = (+$('len').value).toFixed(2);
    stateChanged();
  }

  function refresh() {
    $('state-readout').innerHTML = stateHTML();
    $('meas-readout').innerHTML = measHTML();
    draw();
  }
  // Results computed for an earlier state no longer apply.
  function stateChanged() {
    $('histogram').innerHTML = '';
    $('zxz-result').innerHTML = '';
    refresh();
  }

  /* ---------- animation ---------- */
  // Animate r along at(s), s in [0, 1]. A timer finishes the move even when the
  // browser pauses animation frames (hidden tab), so the end state always lands.
  function animate(at, ms, done) {
    if (anim) anim.finish();
    var end = at(1);
    var t0 = performance.now();
    var a = { id: 0, timer: 0, over: false };
    a.finish = function () {
      if (a.over) return;
      a.over = true;
      cancelAnimationFrame(a.id);
      clearTimeout(a.timer);
      if (anim === a) anim = null;
      r = end;
      syncSliders();
      stateChanged();
      if (done) done();
    };
    function step(now) {
      if (a.over) return;
      var t = Math.min(1, (now - t0) / ms);
      if (t >= 1) { a.finish(); return; }
      var s = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      r = at(s);
      syncSliders();
      refresh();
      a.id = requestAnimationFrame(step);
    }
    anim = a;
    if (document.hidden) { a.finish(); return; }
    a.id = requestAnimationFrame(step);
    a.timer = setTimeout(a.finish, ms + 120);
  }
  function turn(axis, angle, labelTeX) {
    var start = r.slice();
    animate(function (s) { return rotate(start, axis, angle * s); }, 650, function () {
      log(m(labelTeX) + ' applied. New state: ' + m(nameOf(r) || '\\vec r = ' + vec(r)) + '.');
    });
  }

  /* ---------- drawing ---------- */
  var canvas = $('bloch');
  var ctx = canvas.getContext('2d');
  var labels = SimTeX.overlay(canvas);
  var cx = 0, cy = 0, R = 0;
  var cssVars = getComputedStyle(document.documentElement);
  function cssColor(name, fallback) { return cssVars.getPropertyValue(name).trim() || fallback; }
  var C = {
    sphereLight: cssColor('--sim-sphere-light', 'rgba(255,255,255,0.55)'),
    sphereShade: cssColor('--sim-sphere-shade', 'rgba(226,222,212,0.55)'),
    sphereLine: cssColor('--sim-sphere-line', '#5c6470'),
    accent: cssColor('--color-accent', '#1f3a5f'),
    text: cssColor('--color-text', '#202329'),
    muted: cssColor('--color-text-muted', '#5c6470'),
    border: cssColor('--color-border', '#e3e0d8'),
    measure: cssColor('--sim-measure', '#b4532a')
  };

  function camera() {
    var ca = Math.cos(view.az), sa = Math.sin(view.az), ce = Math.cos(view.el), se = Math.sin(view.el);
    return { right: [-sa, ca, 0], up: [-se * ca, -se * sa, ce], fwd: [ce * ca, ce * sa, se] };
  }
  function proj(p, cam) {
    return { x: cx + R * dot(p, cam.right), y: cy - R * dot(p, cam.up), d: dot(p, cam.fwd) };
  }

  // Draw the half of a curve that faces the viewer (front = true) or faces away.
  function curve(fn, cam, front) {
    ctx.beginPath();
    var pen = false;
    for (var i = 0; i <= 144; i++) {
      var q = proj(fn(i / 144 * 2 * Math.PI), cam);
      if ((q.d >= 0) === front) {
        if (pen) ctx.lineTo(q.x, q.y); else { ctx.moveTo(q.x, q.y); pen = true; }
      } else pen = false;
    }
    ctx.stroke();
  }
  var CIRCLES = [
    function (t) { return [Math.cos(t), Math.sin(t), 0]; },   // equator
    function (t) { return [Math.sin(t), 0, Math.cos(t)]; },   // X-Z great circle
    function (t) { return [0, Math.sin(t), Math.cos(t)]; }    // Y-Z great circle
  ];
  var AXES = [
    { key: 'z', v: [0, 0, 1], plus: '\\ket{0}', minus: '\\ket{1}' },
    { key: 'x', v: [1, 0, 0], plus: '\\ket{+}', minus: '\\ket{-}' },
    { key: 'y', v: [0, 1, 0], plus: '\\ket{\\iotap}', minus: '\\ket{\\iotam}' }
  ];

  function line(a, b, color, width, dash) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash || []);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.setLineDash([]);
  }
  function arrowHead(from, to, color) {
    var dx = to.x - from.x, dy = to.y - from.y, L = Math.hypot(dx, dy);
    if (L < 14) return;
    var ux = dx / L, uy = dy / L, s = 11, w = 0.42;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - s * ux + s * w * uy, to.y - s * uy - s * w * ux);
    ctx.lineTo(to.x - s * ux - s * w * uy, to.y - s * uy + s * w * ux);
    ctx.closePath();
    ctx.fill();
  }

  function draw() {
    if (!R) return;
    var cam = camera();
    var O = proj([0, 0, 0], cam);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Back halves first, so the translucent sphere sits over them.
    ctx.lineWidth = 1; ctx.strokeStyle = C.border; ctx.setLineDash([4, 4]);
    CIRCLES.forEach(function (f) { curve(f, cam, false); });
    ctx.setLineDash([]);
    AXES.forEach(function (ax) {
      [1, -1].forEach(function (s) {
        var tip = scale(ax.v, s);
        if (dot(tip, cam.fwd) < 0) line(O, proj(scale(tip, 1.12), cam), C.muted, 1, [3, 4]);
      });
    });

    // Sphere body and outline.
    var g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
    g.addColorStop(0, C.sphereLight);
    g.addColorStop(1, C.sphereShade);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = C.sphereLine; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.stroke();

    // Front halves and the axis labels.
    ctx.lineWidth = 1; ctx.strokeStyle = C.muted;
    CIRCLES.forEach(function (f) { curve(f, cam, true); });
    AXES.forEach(function (ax) {
      [1, -1].forEach(function (s) {
        var tip = scale(ax.v, s);
        var front = dot(tip, cam.fwd) >= 0;
        if (front) line(O, proj(scale(tip, 1.12), cam), C.text, 1.1);
        var p = proj(scale(tip, 1.28), cam);
        labels.set(ax.key + s, s > 0 ? ax.plus : ax.minus, p.x, p.y, front ? C.text : C.muted, front ? 1 : 0.75);
      });
    });

    // Measurement axis.
    var n = axisVec();
    var a1 = proj(n, cam), a2 = proj(scale(n, -1), cam);
    line(a2, a1, C.measure, 2, [7, 5]);
    ctx.fillStyle = C.measure;
    [a1, a2].forEach(function (p) { ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, 2 * Math.PI); ctx.fill(); });
    // Outcome labels beside the axis ends, clear of the state labels.
    var dx = a1.x - O.x, dy = a1.y - O.y, dl = Math.hypot(dx, dy);
    var px = dl > 8 ? -dy / dl : 1, py = dl > 8 ? dx / dl : 0;
    if (px < 0) { px = -px; py = -py; }
    labels.set('m+', '+1', a1.x + 17 * px, a1.y + 17 * py, C.measure);
    labels.set('m-', '-1', a2.x + 17 * px, a2.y + 17 * py, C.measure);

    // The state: drop lines to the equator plane, then the arrow.
    var tip = proj(r, cam), foot = proj([r[0], r[1], 0], cam);
    if (Math.abs(r[2]) > 0.02 && Math.hypot(r[0], r[1]) > 0.02) {
      line(tip, foot, C.accent, 1, [2, 3]);
      line(O, foot, C.accent, 1, [2, 3]);
    }
    if (len(r) > 0.02) {
      line(O, tip, C.accent, 3);
      arrowHead(O, tip, C.accent);
    }
    ctx.fillStyle = C.accent;
    ctx.beginPath(); ctx.arc(tip.x, tip.y, len(r) > 0.02 ? 3 : 5, 0, 2 * Math.PI); ctx.fill();
  }

  function resize() {
    var w = canvas.clientWidth;
    if (!w) return;
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(w * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = w / 2; cy = w / 2; R = w * 0.35;
    draw();
  }

  /* ---------- view dragging ---------- */
  var drag = null;
  canvas.addEventListener('pointerdown', function (e) {
    drag = { x: e.clientX, y: e.clientY, az: view.az, el: view.el };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!drag) return;
    view.az = drag.az - (e.clientX - drag.x) * 0.01;
    view.el = clamp(drag.el + (e.clientY - drag.y) * 0.01, -80 * DEG, 80 * DEG);
    draw();
  });
  ['pointerup', 'pointercancel'].forEach(function (t) {
    canvas.addEventListener(t, function () { drag = null; });
  });
  $('view-reset').addEventListener('click', function () { view.az = 30 * DEG; view.el = 20 * DEG; draw(); });

  /* ---------- controls ---------- */
  ['theta', 'phi', 'len'].forEach(function (id) { $(id).addEventListener('input', fromSliders); });

  var PRESETS = {
    '0': [0, 0, 1], '1': [0, 0, -1], '+': [1, 0, 0], '-': [-1, 0, 0],
    '+y': [0, 1, 0], '-y': [0, -1, 0], 'pi': [0, 0, 0], 'mix': [0.25, 0, 0.75]
  };
  document.querySelectorAll('[data-preset]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (anim) { anim.over = true; cancelAnimationFrame(anim.id); clearTimeout(anim.timer); anim = null; }
      r = PRESETS[b.getAttribute('data-preset')].slice();
      syncSliders();
      stateChanged();
    });
  });

  var GATES = {
    X: { axis: [1, 0, 0], angle: Math.PI },
    Y: { axis: [0, 1, 0], angle: Math.PI },
    Z: { axis: [0, 0, 1], angle: Math.PI },
    H: { axis: [Math.SQRT1_2, 0, Math.SQRT1_2], angle: Math.PI }  // H: |0> <-> |+>
  };
  document.querySelectorAll('[data-gate]').forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-gate');
      turn(GATES[k].axis, GATES[k].angle, k);
    });
  });
  document.querySelectorAll('[data-rot]').forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-rot');
      var phi = +$('rot-angle').value || 0;
      // Course convention exp(+i phi sigma/2): the Bloch vector turns by -phi.
      turn({ X: [1, 0, 0], Y: [0, 1, 0], Z: [0, 0, 1] }[k], -phi * DEG, 'R_' + k + '(' + phi + '^\\circ)');
    });
  });

  document.querySelectorAll('[data-axis]').forEach(function (b) {
    b.addEventListener('click', function () {
      axisName = b.getAttribute('data-axis');
      document.querySelectorAll('[data-axis]').forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
      $('custom-axis').classList.toggle('sim-hidden', axisName !== 'n');
      $('histogram').innerHTML = '';
      refresh();
    });
  });
  ['m-theta', 'm-phi'].forEach(function (id) {
    $(id).addEventListener('input', function () {
      $(id + '-out').textContent = $(id).value + '°';
      $('histogram').innerHTML = '';
      refresh();
    });
  });

  $('measure-one').addEventListener('click', function () {
    var n = axisVec(), pPlus = (1 + dot(r, n)) / 2;
    var out = Math.random() < pPlus ? 1 : -1;
    var start = r.slice(), target = scale(n, out);
    var p = out > 0 ? pPlus : 1 - pPlus;
    animate(function (s) { return [0, 1, 2].map(function (i) { return start[i] * (1 - s) + target[i] * s; }); }, 450, function () {
      log(m(axisTeX()) + ' measured: outcome ' + m(out > 0 ? '+1' : '-1') + ' (probability ' + num(p) +
        '), post-measurement state ' + m(eigTeX(out)) + '.');
    });
  });

  $('measure-many').addEventListener('click', function () {
    var N = +$('copies').value, pPlus = (1 + dot(r, axisVec())) / 2, plus = 0;
    for (var i = 0; i < N; i++) if (Math.random() < pPlus) plus++;
    $('histogram').innerHTML = histHTML(N, plus);
  });

  $('run-zxz').addEventListener('click', function () {
    var N = 1000, Z = [0, 0, 1], X = [1, 0, 0];
    var c = [0, 0, 0], same = 0;
    for (var i = 0; i < N; i++) {
      var s = r;
      var a = Math.random() < (1 + dot(s, Z)) / 2 ? 1 : -1; s = scale(Z, a);
      var b = Math.random() < (1 + dot(s, X)) / 2 ? 1 : -1; s = scale(X, b);
      var d = Math.random() < (1 + dot(s, Z)) / 2 ? 1 : -1;
      if (a > 0) c[0]++;
      if (b > 0) c[1]++;
      if (d > 0) c[2]++;
      if (d === a) same++;
    }
    var rows = [['1', 'Z', c[0]], ['2', 'X', c[1]], ['3', 'Z', c[2]]].map(function (row) {
      return '<tr><td>' + row[0] + '</td><td>' + m(row[1]) + '</td><td>' + row[2] + '</td><td>' + (N - row[2]) + '</td></tr>';
    }).join('');
    $('zxz-result').innerHTML =
      '<table class="sim-table"><thead><tr><th>Step</th><th>Observable</th><th>' + m('+1') + '</th><th>' + m('-1') + '</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p class="sim-readout" style="margin-top:0.6rem;">Step 3 gave the same outcome as step 1 for <strong>' + same + ' of ' + N + '</strong> copies.</p>';
  });

  window.addEventListener('resize', resize);
  SimTeX.renderIn(document.querySelector('main'));
  syncSliders();
  refresh();
  resize();
})();
