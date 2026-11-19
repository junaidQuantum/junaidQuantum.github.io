/* EE608: qubit channels on the Bloch ball (Lectures 8 and 9).
   Each channel is given by Kraus operators V_l (2x2 complex). On Bloch vectors a
   qubit channel acts as an affine map r' = T r + t with
     T_ij = Tr{sigma_i N(sigma_j)}/2,   t_i = Tr{sigma_i N(I)}/2.
   A chain N_k o ... o N_1 composes as T = T2 T1, t = T2 t1 + t2.
   Test states: purity (1 + |r|^2)/2, trace distance |r - s|/2,
   fidelity F = Tr{rho sigma} + 2 sqrt(det rho det sigma) (squared form, Lecture 9).
   Preservation: F(psi) = (1 + r.(T r + t))/2 for a pure input with Bloch vector r;
   F_avg = 1/2 + tr(T)/6; BB84 states: F = 1 - Q with Q = (2 - T_xx - T_zz)/4. */
(function () {
  'use strict';

  var m = SimTeX.tex;
  var MINUS = '\u2212';
  var DEG = Math.PI / 180;
  var $ = function (id) { return document.getElementById(id); };

  var stages = [];
  var view = { az: 30 * DEG, el: 20 * DEG };

  /* ---------- numbers and vectors ---------- */
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
  function tc(z) {
    var re = z[0], im = z[1];
    if (Math.abs(im) < 5e-4) return tn(re);
    if (Math.abs(re) < 5e-4) return tn(im) + 'i';
    return tn(re) + (im < 0 ? ' - ' : ' + ') + tn(Math.abs(im)) + 'i';
  }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function len(a) { return Math.sqrt(dot(a, a)); }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function scale(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function polar(l, th, ph) {
    var t = th * DEG, p = ph * DEG;
    return [l * Math.sin(t) * Math.cos(p), l * Math.sin(t) * Math.sin(p), l * Math.cos(t)];
  }
  function vecTeX(v) { return '(' + tn(v[0]) + ',\\ ' + tn(v[1]) + ',\\ ' + tn(v[2]) + ')'; }

  /* ---------- 2x2 complex matrices: [m00, m01, m10, m11], entries [re, im] ---------- */
  function c(re, im) { return [re, im || 0]; }
  function cmul(x, y) { return [x[0] * y[0] - x[1] * y[1], x[0] * y[1] + x[1] * y[0]]; }
  function cadd(x, y) { return [x[0] + y[0], x[1] + y[1]]; }
  function conj(x) { return [x[0], -x[1]]; }
  function mmul(A, B) {
    return [cadd(cmul(A[0], B[0]), cmul(A[1], B[2])), cadd(cmul(A[0], B[1]), cmul(A[1], B[3])),
            cadd(cmul(A[2], B[0]), cmul(A[3], B[2])), cadd(cmul(A[2], B[1]), cmul(A[3], B[3]))];
  }
  function dag(A) { return [conj(A[0]), conj(A[2]), conj(A[1]), conj(A[3])]; }
  function madd(A, B) { return A.map(function (x, i) { return cadd(x, B[i]); }); }
  function mscale(A, s) { return A.map(function (x) { return [x[0] * s, x[1] * s]; }); }
  function trace(A) { return cadd(A[0], A[3]); }
  var I2 = [c(1), c(0), c(0), c(1)];
  var PX = [c(0), c(1), c(1), c(0)];
  var PY = [c(0), c(0, -1), c(0, 1), c(0)];
  var PZ = [c(1), c(0), c(0), c(-1)];
  var PAULI = [PX, PY, PZ];
  function mTeX(A) { return '\\begin{pmatrix} ' + tc(A[0]) + ' & ' + tc(A[1]) + ' \\\\ ' + tc(A[2]) + ' & ' + tc(A[3]) + ' \\end{pmatrix}'; }

  /* ---------- channel types ---------- */
  // Each type: name, parameters, Kraus operators, and a TeX description of them.
  function pauliKraus(w) {   // w = [pI, pX, pY, pZ]
    return [I2, PX, PY, PZ].map(function (P, i) { return { M: mscale(P, Math.sqrt(Math.max(0, w[i]))), w: w[i], sym: ['I', 'X', 'Y', 'Z'][i] }; })
      .filter(function (k) { return k.w > 1e-12; });
  }
  var TYPES = {
    bitflip: { name: 'Bit flip', params: [['p', 'p', 0, 1, 0.01]],
      kraus: function (s) { return pauliKraus([1 - s.p, s.p, 0, 0]); } },
    phaseflip: { name: 'Phase flip (dephasing)', params: [['p', 'p', 0, 1, 0.01]],
      kraus: function (s) { return pauliKraus([1 - s.p, 0, 0, s.p]); } },
    bitphase: { name: 'Bit-phase flip', params: [['p', 'p', 0, 1, 0.01]],
      kraus: function (s) { return pauliKraus([1 - s.p, 0, s.p, 0]); } },
    depol: { name: 'Depolarizing', params: [['p', 'p', 0, 1, 0.01]],
      kraus: function (s) { return pauliKraus([1 - 3 * s.p / 4, s.p / 4, s.p / 4, s.p / 4]); } },
    pauli: { name: 'Pauli channel', params: [['px', 'p_X', 0, 1, 0.01], ['py', 'p_Y', 0, 1, 0.01], ['pz', 'p_Z', 0, 1, 0.01]],
      kraus: function (s) { return pauliKraus([1 - s.px - s.py - s.pz, s.px, s.py, s.pz]); } },
    ad: { name: 'Amplitude damping', params: [['g', '\\gamma', 0, 1, 0.01]],
      kraus: function (s) {
        return [{ M: [c(0), c(Math.sqrt(s.g)), c(0), c(0)], name: 'A_0' }, { M: [c(1), c(0), c(0), c(Math.sqrt(1 - s.g))], name: 'A_1' }];
      } },
    probe: { name: 'Eve\'s probe (Lecture 8)', params: [['th', '\\theta', 0, 180, 1]],
      kraus: function (s) {
        var h = s.th * DEG / 2;
        return [{ M: [c(1), c(0), c(0), c(Math.cos(h))], name: 'B_0' }, { M: [c(0), c(0), c(0), c(Math.sin(h))], name: 'B_1' }];
      } },
    unitary: { name: 'Unitary rotation', params: [['phi', '\\phi', -180, 180, 1]], axis: true,
      kraus: function (s) {
        // Course convention: R_n(phi) = exp(+i phi sigma_n / 2) = cos(phi/2) I + i sin(phi/2) sigma_n.
        var h = s.phi * DEG / 2, P = { X: PX, Y: PY, Z: PZ }[s.axis];
        return [{ M: madd(mscale(I2, Math.cos(h)), P.map(function (z) { return cmul(c(0, Math.sin(h)), z); })), name: 'R_' + s.axis + '(\\phi)' }];
      } }
  };
  var DEFAULTS = { p: 0.25, px: 0.1, py: 0.1, pz: 0.1, g: 0.5, th: 90, phi: 90, axis: 'Z' };
  function newStage(type, over) {
    var s = { type: type };
    Object.keys(DEFAULTS).forEach(function (k) { s[k] = DEFAULTS[k]; });
    Object.keys(over || {}).forEach(function (k) { s[k] = over[k]; });
    return s;
  }

  /* ---------- Bloch representation ---------- */
  function applyKraus(K, A) {
    return K.reduce(function (acc, k) { return madd(acc, mmul(mmul(k.M, A), dag(k.M))); }, [c(0), c(0), c(0), c(0)]);
  }
  function blochMap(K) {
    var T = [0, 1, 2].map(function (i) { return [0, 1, 2].map(function (j) { return trace(mmul(PAULI[i], applyKraus(K, PAULI[j])))[0] / 2; }); });
    var NI = applyKraus(K, I2);
    var t = [0, 1, 2].map(function (i) { return trace(mmul(PAULI[i], NI))[0] / 2; });
    return { T: T, t: t };
  }
  function matVec(T, v) { return [0, 1, 2].map(function (i) { return dot(T[i], v); }); }
  function matMat(A, B) { return [0, 1, 2].map(function (i) { return [0, 1, 2].map(function (j) { return A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j]; }); }); }
  function totalMap() {
    var T = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], t = [0, 0, 0];
    stages.forEach(function (s) {
      var b = blochMap(TYPES[s.type].kraus(s));
      T = matMat(b.T, T);
      t = add(matVec(b.T, t), b.t);
    });
    return { T: T, t: t };
  }
  function apply(Mp, r) { return add(matVec(Mp.T, r), Mp.t); }

  /* ---------- readouts ---------- */
  function krausHTML(s) {
    var K = TYPES[s.type].kraus(s);
    var parts = K.map(function (k, l) {
      if (k.sym) return 'V_' + l + ' = ' + tn(Math.sqrt(k.w)) + '\\,' + k.sym;
      return k.name + ' = ' + mTeX(k.M);
    });
    var comp = K.reduce(function (acc, k) { return madd(acc, mmul(dag(k.M), k.M)); }, [c(0), c(0), c(0), c(0)]);
    var okComp = Math.abs(comp[0][0] - 1) < 1e-9 && Math.abs(comp[3][0] - 1) < 1e-9 && Math.hypot(comp[1][0], comp[1][1]) < 1e-9;
    return m(parts.join(',\\quad ')) + '<br><span class="sim-note">' + m('\\sum_l V_l^\\dagger V_l = I') + (okComp ? ' \u2713' : ' \u2717') + '</span>';
  }

  function mapHTML(Mp) {
    var T = Mp.T, t = Mp.t;
    var Ttex = '\\begin{pmatrix} ' + T.map(function (row) { return row.map(function (x) { return tn(x); }).join(' & '); }).join(' \\\\ ') + ' \\end{pmatrix}';
    var unital = len(t) < 1e-6;
    return '<p>' + m('\\vec r^{\\prime} = T\\vec r + \\vec t') + ' with ' + m('T = ' + Ttex) + ' and <span class="nowrap">' + m('\\vec t = ' + vecTeX(t)) + '</span>.</p>' +
      '<p>' + (unital ? '<span class="sim-ok">Unital:</span> ' + m('\\mathcal N(\\pi) = \\pi') + ', the center of the ball stays fixed.'
        : '<span class="sim-bad">Not unital:</span> ' + m('\\mathcal N(\\pi) \\ne \\pi') + '. The center moves to <span class="nowrap">' + m('\\vec t = ' + vecTeX(t)) + '</span>.') + '</p>' +
      '<p class="sim-note">The image of the sphere is an ellipsoid inside the ball with semi-axes equal to the singular values of ' + m('T') + ': ' +
      m(singular(T).map(function (x) { return tn(x); }).join(',\\ ')) + '.</p>';
  }
  // Singular values of a 3x3 real matrix: square roots of the eigenvalues of T^T T (Jacobi rotations).
  function singular(T) {
    var A = matMat([0, 1, 2].map(function (i) { return [0, 1, 2].map(function (j) { return T[j][i]; }); }), T);
    for (var sweep = 0; sweep < 30; sweep++) {
      for (var p = 0; p < 3; p++) for (var q = p + 1; q < 3; q++) {
        if (Math.abs(A[p][q]) < 1e-14) continue;
        var th = 0.5 * Math.atan2(2 * A[p][q], A[q][q] - A[p][p]), cs = Math.cos(th), sn = Math.sin(th);
        for (var k = 0; k < 3; k++) { var a = A[k][p], b = A[k][q]; A[k][p] = cs * a - sn * b; A[k][q] = sn * a + cs * b; }
        for (k = 0; k < 3; k++) { a = A[p][k]; b = A[q][k]; A[p][k] = cs * a - sn * b; A[q][k] = sn * a + cs * b; }
      }
    }
    return [A[0][0], A[1][1], A[2][2]].map(function (x) { return Math.sqrt(Math.max(0, x)); }).sort(function (a, b) { return b - a; });
  }

  function testStates() {
    return { r: polar(+$('r-len').value, +$('r-th').value, +$('r-ph').value), s: polar(+$('s-len').value, +$('s-th').value, +$('s-ph').value) };
  }
  function fidelity(a, b) {
    var tr = (1 + dot(a, b)) / 2, da = (1 - dot(a, a)) / 4, db = (1 - dot(b, b)) / 4;
    return tr + 2 * Math.sqrt(Math.max(0, da) * Math.max(0, db));
  }
  function testHTML(Mp) {
    var S = testStates(), r2 = apply(Mp, S.r), s2 = apply(Mp, S.s);
    var pur = function (v) { return (1 + dot(v, v)) / 2; };
    var d1 = len(sub(S.r, S.s)) / 2, d2 = len(sub(r2, s2)) / 2;
    var rows = [
      ['Purity of ' + m('\\rho'), num(pur(S.r)), num(pur(r2))],
      ['Purity of ' + m('\\sigma'), num(pur(S.s)), num(pur(s2))],
      ['Trace distance ' + m('\\tfrac12\\lVert\\rho - \\sigma\\rVert_1'), num(d1), num(d2)],
      ['Fidelity ' + m('F(\\rho, \\sigma)'), num(fidelity(S.r, S.s)), num(fidelity(r2, s2))]
    ].map(function (r) { return '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>'; }).join('');
    var note = d1 > 1e-6
      ? 'The trace distance changed by a factor ' + num(d2 / d1) + '. No channel can increase it.'
      : 'The two states are equal.';
    var vecs = '<p class="sim-readout"><span class="nowrap">' + m('\\vec r = ' + vecTeX(S.r)) + '</span> \u2192 <span class="nowrap">' + m(vecTeX(r2)) + '</span><br>' +
      '<span class="nowrap">' + m('\\vec s = ' + vecTeX(S.s)) + '</span> \u2192 <span class="nowrap">' + m(vecTeX(s2)) + '</span></p>';
    return vecs + '<table class="sim-table"><thead><tr><th></th><th>Before</th><th>After ' + m('\\mathcal N') + '</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p class="sim-note">' + note + '</p>';
  }

  // Minimum fidelity over pure inputs: dense search on the sphere, then local refinement.
  function fMin(Mp) {
    function f(r) { return (1 + dot(r, apply(Mp, r))) / 2; }
    var best = null, bv = Infinity, N = 1500, ga = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < N; i++) {
      var z = 1 - 2 * (i + 0.5) / N, rr = Math.sqrt(1 - z * z), a = i * ga;
      var v = [rr * Math.cos(a), rr * Math.sin(a), z], fv = f(v);
      if (fv < bv) { bv = fv; best = v; }
    }
    var step = 0.05;
    for (var k = 0; k < 400; k++) {
      var cand = add(best, [step * (Math.random() - 0.5), step * (Math.random() - 0.5), step * (Math.random() - 0.5)]);
      cand = scale(cand, 1 / len(cand));
      var fc = f(cand);
      if (fc < bv) { bv = fc; best = cand; } else if (k % 50 === 49) step /= 2;
    }
    return { F: bv, r: best };
  }
  function fidHTML(Mp, fm) {
    var T = Mp.T, avg = 0.5 + (T[0][0] + T[1][1] + T[2][2]) / 6, Q = (2 - T[0][0] - T[2][2]) / 4;
    return '<p>For a pure input with Bloch vector ' + m('\\vec r') + ', the output has Bloch vector ' + m('\\vec r^{\\prime}') + ' and ' +
      m('\\bra{\\psi}\\mathcal N(\\psi)\\ket{\\psi} = \\tfrac12\\left(1 + \\vec r\\cdot\\vec r^{\\prime}\\right)') + '.</p>' +
      '<table class="sim-table"><tbody>' +
      '<tr><td>Minimum fidelity ' + m('F_{\\min}(\\mathcal N)') + '</td><td>' + num(fm.F) + '</td></tr>' +
      '<tr><td>Average over all pure states</td><td>' + num(avg) + '</td></tr>' +
      '<tr><td>Expected fidelity for the four BB84 states</td><td>' + num(1 - Q) + '</td></tr>' +
      '<tr><td>BB84 error rate ' + m('Q = 1 - F') + '</td><td>' + num(Q) + '</td></tr>' +
      '</tbody></table>' +
      '<p class="sim-note">' + m('F_{\\min}') + ' is reached at ' + m('\\vec r = ' + vecTeX(fm.r)) + ' (orange ring on the sphere). The average is ' +
      m('\\tfrac12 + \\operatorname{tr}(T)/6') + '.</p>';
  }

  /* ---------- stage editor ---------- */
  function sliderHTML(i, s, p) {
    var key = p[0], v = s[key];
    var out = key === 'th' || key === 'phi' ? Math.round(v) + '\u00B0' : (+v).toFixed(2);
    return '<label class="sim-slider"><span>' + m(p[1]) + '</span><input type="range" data-st="' + i + '" data-f="' + key + '" min="' + p[2] + '" max="' + p[3] +
      '" step="' + p[4] + '" value="' + v + '"><output id="st-' + i + '-' + key + '">' + out + '</output></label>';
  }
  function renderStages() {
    $('stages').innerHTML = stages.map(function (s, i) {
      var T = TYPES[s.type];
      var opts = Object.keys(TYPES).map(function (k) { return '<option value="' + k + '"' + (k === s.type ? ' selected' : '') + '>' + TYPES[k].name + '</option>'; }).join('');
      var axis = T.axis ? '<div class="sim-row"><span>Axis:</span>' + ['X', 'Y', 'Z'].map(function (a) {
        return '<button class="sim-btn" type="button" data-st-axis="' + i + '" data-axis="' + a + '" aria-pressed="' + (s.axis === a) + '">' + m(a) + '</button>';
      }).join('') + '</div>' : '';
      return '<div class="stage"><div class="stage-head"><strong>' + m('\\mathcal N_' + (i + 1)) + '</strong>' +
        '<select class="sim-select" data-st-type="' + i + '">' + opts + '</select>' +
        '<button class="del" type="button" data-st-del="' + i + '" aria-label="Remove this channel">\u00D7</button></div>' +
        axis + T.params.map(function (p) { return sliderHTML(i, s, p); }).join('') +
        '<div class="stage-kraus" id="st-kraus-' + i + '"></div></div>';
    }).join('') || '<p class="sim-note">No channel: the identity.</p>';
  }

  /* ---------- drawing ---------- */
  var canvas = $('bloch');
  var ctx = canvas.getContext('2d');
  var labels = SimTeX.overlay(canvas);
  var cx = 0, cy = 0, R = 0;
  var cssVars = getComputedStyle(document.documentElement);
  function cssColor(name, fallback) { return cssVars.getPropertyValue(name).trim() || fallback; }
  var C = {
    rho: cssColor('--color-accent', '#1f3a5f'),
    sig: '#1f7a6d',
    img: cssColor('--sim-measure', '#b4532a'),
    text: cssColor('--color-text', '#202329'),
    muted: cssColor('--color-text-muted', '#5c6470'),
    border: cssColor('--color-border', '#e3e0d8')
  };
  function camera() {
    var ca = Math.cos(view.az), sa = Math.sin(view.az), ce = Math.cos(view.el), se = Math.sin(view.el);
    return { right: [-sa, ca, 0], up: [-se * ca, -se * sa, ce], fwd: [ce * ca, ce * sa, se] };
  }
  function proj(p, cam) { return { x: cx + R * dot(p, cam.right), y: cy - R * dot(p, cam.up), d: dot(p, cam.fwd) }; }
  // Draw the half of a closed curve facing the viewer (front) or facing away, judged from `centre`.
  function curve(fn, cam, front, centre) {
    var c0 = centre ? dot(centre, cam.fwd) : 0;
    ctx.beginPath();
    var pen = false;
    for (var i = 0; i <= 144; i++) {
      var q = proj(fn(i / 144 * 2 * Math.PI), cam);
      if ((q.d - c0 >= 0) === front) { if (pen) ctx.lineTo(q.x, q.y); else { ctx.moveTo(q.x, q.y); pen = true; } } else pen = false;
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
  // Wireframe of the unit sphere: latitudes and meridians.
  var WIRE = [30, 60, 90, 120, 150].map(function (th) {
    return function (t) { return polar(1, th, t / DEG); };
  }).concat([0, 30, 60, 90, 120, 150].map(function (ph) {
    return function (t) { return [Math.sin(t) * Math.cos(ph * DEG), Math.sin(t) * Math.sin(ph * DEG), Math.cos(t)]; };
  }));
  function line(a, b, color, width, dash) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash || []);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
  }
  function dotAt(p, rad, color, filled) {
    ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, 2 * Math.PI);
    if (filled) { ctx.fillStyle = color; ctx.fill(); } else { ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke(); }
  }

  var cache = { Mp: null, fm: null };
  function draw() {
    if (!R || !cache.Mp) return;
    var Mp = cache.Mp, cam = camera(), O = proj([0, 0, 0], cam);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 1; ctx.strokeStyle = C.border; ctx.setLineDash([4, 4]);
    CIRCLES.forEach(function (f) { curve(f, cam, false); });
    ctx.setLineDash([]);
    var g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
    g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(226,222,212,0.5)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = C.border;
    CIRCLES.forEach(function (f) { curve(f, cam, true); });
    AXES.forEach(function (ax) {
      [1, -1].forEach(function (s) {
        var t = scale(ax.v, s), front = dot(t, cam.fwd) >= 0;
        line(O, proj(scale(t, 1.12), cam), front ? C.muted : C.border, 1, front ? [] : [3, 4]);
        var p = proj(scale(t, 1.28), cam);
        labels.set(ax.key + s, s > 0 ? ax.plus : ax.minus, p.x, p.y, front ? C.text : C.muted, front ? 0.9 : 0.6);
      });
    });

    // Image of the sphere.
    var centre = Mp.t;
    WIRE.forEach(function (f) {
      var h = function (t) { return apply(Mp, f(t)); };
      ctx.strokeStyle = C.img; ctx.lineWidth = 1; ctx.globalAlpha = 0.35; ctx.setLineDash([3, 3]);
      curve(h, cam, false, centre);
      ctx.globalAlpha = 1; ctx.setLineDash([]); ctx.lineWidth = 1.4;
      curve(h, cam, true, centre);
    });

    // N(pi), the worst-preserved state, and the test states.
    var Np = proj(Mp.t, cam);
    dotAt(Np, 4.5, C.text, true);
    labels.set('npi', '\\mathcal N(\\pi)', Np.x + 22, Np.y + 12, C.text, 1, 'small');
    if (cache.fm) {
      var w = proj(cache.fm.r, cam);
      dotAt(w, 8, C.img, false);
    }
    var S = testStates(), r2 = apply(Mp, S.r), s2 = apply(Mp, S.s);
    var P = { r: proj(S.r, cam), s: proj(S.s, cam), r2: proj(r2, cam), s2: proj(s2, cam) };
    line(P.r, P.s, C.muted, 1, [2, 4]);
    line(P.r2, P.s2, C.text, 1.4);
    line(P.r, P.r2, C.rho, 1.2, [4, 3]);
    line(P.s, P.s2, C.sig, 1.2, [4, 3]);
    dotAt(P.r, 6, C.rho, false); dotAt(P.s, 6, C.sig, false);
    dotAt(P.r2, 5, C.rho, true); dotAt(P.s2, 5, C.sig, true);
    labels.set('lr', '\\rho', P.r.x - 12, P.r.y - 12, C.rho);
    labels.set('ls', '\\sigma', P.s.x - 12, P.s.y - 12, C.sig);
    labels.set('lr2', '\\mathcal N(\\rho)', P.r2.x + 26, P.r2.y - 10, C.rho, 1, 'small');
    labels.set('ls2', '\\mathcal N(\\sigma)', P.s2.x + 26, P.s2.y + 12, C.sig, 1, 'small');
  }
  function resize() {
    var wdt = canvas.clientWidth;
    if (!wdt) return;
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(wdt * dpr); canvas.height = Math.round(wdt * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = wdt / 2; cy = wdt / 2; R = wdt * 0.35;
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
  $('view-reset').addEventListener('click', function () { view.az = 30 * DEG; view.el = 20 * DEG; draw(); });

  /* ---------- refresh and events ---------- */
  function refresh() {
    var Mp = totalMap();
    cache.Mp = Mp;
    cache.fm = fMin(Mp);
    stages.forEach(function (s, i) { var el = $('st-kraus-' + i); if (el) el.innerHTML = krausHTML(s); });
    ['r-th', 'r-ph', 's-th', 's-ph'].forEach(function (id) { $(id + '-out').textContent = $(id).value + '\u00B0'; });
    ['r-len', 's-len'].forEach(function (id) { $(id + '-out').textContent = (+$(id).value).toFixed(2); });
    $('map-readout').innerHTML = mapHTML(Mp);
    $('test-readout').innerHTML = testHTML(Mp);
    $('fid-readout').innerHTML = fidHTML(Mp, cache.fm);
    draw();
  }
  // Only the test states changed: the channel, F_min and the map stay the same.
  function refreshTests() {
    ['r-th', 'r-ph', 's-th', 's-ph'].forEach(function (id) { $(id + '-out').textContent = $(id).value + '\u00B0'; });
    ['r-len', 's-len'].forEach(function (id) { $(id + '-out').textContent = (+$(id).value).toFixed(2); });
    $('test-readout').innerHTML = testHTML(cache.Mp);
    draw();
  }
  ['r-th', 'r-ph', 'r-len', 's-th', 's-ph', 's-len'].forEach(function (id) { $(id).addEventListener('input', refreshTests); });

  $('stages').addEventListener('input', function (ev) {
    var t = ev.target, i = t.getAttribute('data-st');
    if (i === null) return;
    var s = stages[+i], f = t.getAttribute('data-f'), v = +t.value;
    if (s.type === 'pauli' && (f === 'px' || f === 'py' || f === 'pz')) {
      // Keep p_I = 1 - p_X - p_Y - p_Z non-negative.
      var others = ['px', 'py', 'pz'].filter(function (k) { return k !== f; }).reduce(function (a, k) { return a + s[k]; }, 0);
      v = Math.min(v, 1 - others);
      t.value = v;
    }
    s[f] = v;
    var out = $('st-' + i + '-' + f);
    if (out) out.textContent = f === 'th' || f === 'phi' ? Math.round(v) + '\u00B0' : v.toFixed(2);
    refresh();
  });
  $('stages').addEventListener('change', function (ev) {
    var t = ev.target, i = t.getAttribute('data-st-type');
    if (i === null) return;
    stages[+i] = newStage(t.value);
    renderStages(); refresh();
  });
  $('stages').addEventListener('click', function (ev) {
    var del = ev.target.closest('[data-st-del]'), ax = ev.target.closest('[data-st-axis]');
    if (del) { stages.splice(+del.getAttribute('data-st-del'), 1); renderStages(); refresh(); }
    if (ax) { stages[+ax.getAttribute('data-st-axis')].axis = ax.getAttribute('data-axis'); renderStages(); refresh(); }
  });
  $('add-stage').addEventListener('click', function () { stages.push(newStage('phaseflip')); renderStages(); refresh(); });

  var PRESETS = {
    deph: [['phaseflip', { p: 0.25 }]],
    depol: [['depol', { p: 0.4 }]],
    ad: [['ad', { g: 0.5 }]],
    fiber: [['ad', { g: 0.3 }], ['ad', { g: 0.5 }]],
    probe: [['probe', { th: 90 }]]
  };
  document.querySelectorAll('[data-preset]').forEach(function (b) {
    b.addEventListener('click', function () {
      stages = PRESETS[b.getAttribute('data-preset')].map(function (p) { return newStage(p[0], p[1]); });
      renderStages(); refresh();
    });
  });

  /* ---------- start ---------- */
  stages = [newStage('ad', { g: 0.5 })];
  window.addEventListener('resize', resize);
  SimTeX.renderIn(document.querySelector('main'));
  renderStages();
  refresh();
  resize();
})();
