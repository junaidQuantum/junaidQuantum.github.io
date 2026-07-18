/* Loads the shared navigation and footer partials into every page,
   then wires up the active-link highlight and the mobile nav toggle.
   To change the header or footer markup, edit partials/nav.html or
   partials/footer.html only — every page picks it up automatically. */
(function () {
  function highlightActive() {
    var current = (window.location.pathname.split('/').pop() || 'index.html').replace('.html', '') || 'index';
    document.querySelectorAll('.nav-links a[data-page]').forEach(function (link) {
      if (link.getAttribute('data-page') === current) {
        link.classList.add('active');
      }
    });
  }

  function wireToggle() {
    var toggle = document.getElementById('nav-toggle');
    var links = document.getElementById('nav-links');
    if (toggle && links) {
      toggle.addEventListener('click', function () {
        links.classList.toggle('open');
      });
    }
  }

  function load(id, url, after) {
    var el = document.getElementById(id);
    if (!el) return;
    fetch(url)
      .then(function (res) { return res.text(); })
      .then(function (html) {
        el.innerHTML = html;
        if (after) after();
      })
      .catch(function () { /* silently ignore if partial can't be fetched (e.g. opened via file://) */ });
  }

  document.addEventListener('DOMContentLoaded', function () {
    load('site-nav', 'partials/nav.html', function () {
      highlightActive();
      wireToggle();
    });
    load('site-footer', 'partials/footer.html');
  });
})();
