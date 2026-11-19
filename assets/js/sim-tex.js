/* Shared LaTeX helpers for the EE608 simulation pages (uses KaTeX).
   SimTeX.tex(s)        -> HTML for inline math s
   SimTeX.renderIn(el)  -> typeset \( ... \) and \[ ... \] inside el
   SimTeX.overlay(cv)   -> HTML labels positioned over a canvas */
(function () {
  'use strict';

  var MACROS = {
    '\\iotap': '\\dot{\\iota}+',
    '\\iotam': '\\dot{\\iota}-'
  };
  var OPTS = { throwOnError: false, macros: MACROS };
  var cache = {};

  function tex(s, display) {
    var key = (display ? 'D:' : 'I:') + s;
    if (!cache[key]) {
      cache[key] = window.katex
        ? katex.renderToString(s, { throwOnError: false, macros: MACROS, displayMode: !!display })
        : s;
    }
    return cache[key];
  }

  function renderIn(el) {
    if (!window.renderMathInElement) return;
    renderMathInElement(el, {
      delimiters: [
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false }
      ],
      throwOnError: false,
      macros: MACROS
    });
  }

  // Labels drawn as HTML over a canvas, so they use the same TeX fonts.
  function overlay(canvas) {
    var wrap = document.createElement('div');
    wrap.className = 'sim-canvas-wrap';
    canvas.parentNode.insertBefore(wrap, canvas);
    wrap.appendChild(canvas);
    var layer = document.createElement('div');
    layer.className = 'sim-overlay';
    wrap.appendChild(layer);
    var labels = {};
    return {
      // Place label `key` showing TeX `s` centred at canvas point (x, y).
      // `cls` adds a class (e.g. 'small' for axis ticks).
      set: function (key, s, x, y, color, opacity, cls) {
        var el = labels[key];
        if (!el) {
          el = document.createElement('div');
          el.className = 'sim-label';
          layer.appendChild(el);
          labels[key] = el;
        }
        if (el._tex !== s) { el.innerHTML = tex(s); el._tex = s; }
        el.className = 'sim-label' + (cls ? ' ' + cls : '');
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.style.color = color || '';
        el.style.opacity = opacity === undefined ? 1 : opacity;
        el.style.display = '';
      },
      hide: function (key) { if (labels[key]) labels[key].style.display = 'none'; }
    };
  }

  window.SimTeX = { tex: tex, renderIn: renderIn, overlay: overlay, options: OPTS };
})();
