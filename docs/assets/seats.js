/* How it works: one call's path as tabs over the office. One stop at a time sits in a hard-edged spotlight
   (an SVG mask, no gradient) and its card comes forward. Without JS, every card is listed in order and the
   office stays hidden. No timeline and no autoplay: the camera moves only when the reader picks a tab.
   The clip (clip/seats.html) reuses SEAT and drives the camera through window.HLR_SEATS. */
(function () {
  // A link to a closed <details> (or to something inside one) opens it: #schedule, #tests, #request.
  function openHash() {
    var id = decodeURIComponent((location.hash || '').slice(1)), el = id && document.getElementById(id), d;
    if (!el) return;
    for (d = el.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true;
    if (el.closest('details')) el.scrollIntoView();
  }
  openHash(); addEventListener('hashchange', openHash);

  var root = document.querySelector('[data-seats]');
  if (!root || !window.FLOOR) return;
  var F = window.FLOOR, NS = 'http://www.w3.org/2000/svg';
  var host = root.querySelector('.sc-floor'), lab = root.querySelector('.sc-lab');
  var tabs = [].slice.call(root.querySelectorAll('[role=tab]'));
  var dark = matchMedia('(prefers-color-scheme: dark)'), reduce = matchMedia('(prefers-reduced-motion: reduce)');
  // [anchor, label, camera width in scene px, spotlight rx, ry]
  var SEAT = {
    scripts: ['scripts', 'Scripts · no model', 380, 120, 120],
    m1: ['analyst', '1 · the analyst', 300, 70, 60],
    m2: ['risk', '2 · the risk officer', 300, 70, 60],
    m3: ['committee', '3 · the chair', 340, 120, 80],
    pm: ['sidd', '4 · Sidd, portfolio manager', 340, 110, 80],
    publish: ['record', '5 · the record', 440, 150, 130]
  };
  var svg, hole, cam, spot, cur = 'm1', raf = 0, first = tabs.length > 1 ? tabs[0].dataset.k : 'm1';
  var bar = tabs.length ? tabs[0].parentNode : null;
  document.documentElement.classList.add('js-seats');

  function draw() {
    if (!host.clientWidth) return false; // laid out at zero (a hidden tab): drawn on the first resize instead
    F.build(host, dark.matches, { vetoes: window.SAMPLE && window.SAMPLE.trayCount != null ? window.SAMPLE.trayCount : 3 });
    svg = host.querySelector('svg');
    svg.removeAttribute('role'); svg.removeAttribute('aria-labelledby'); svg.setAttribute('focusable', 'false');
    var t = svg.querySelector('title'); if (t) t.remove();
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    var f = svg.getAttribute('viewBox').split(' ').map(Number), x = f[0] - 2000, y = f[1] - 2000, w = f[2] + 4000, h = f[3] + 4000;
    var g = document.createElementNS(NS, 'g');
    g.innerHTML = '<mask id="sc-spot"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="#fff"/><ellipse id="sc-hole" fill="#000"/></mask>' +
      '<rect class="sc-dim" mask="url(#sc-spot)" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"/>';
    svg.appendChild(g);
    hole = document.getElementById('sc-hole');
    cam = null; spot = null;
    return true;
  }
  function target(k) {
    var s = SEAT[k], a = F.anchors[s[0]], r = host.clientHeight / host.clientWidth || 0.75;
    var w = s[2], h = w * r, cx = parseFloat(a[0]), cy = parseFloat(a[1]) + 20;
    return { vb: [cx - w / 2, cy - h / 2, w, h], spot: [cx, cy + 4, s[3], s[4]] };
  }
  function paint(vb, sp) {
    svg.setAttribute('viewBox', vb.map(function (n) { return n.toFixed(1); }).join(' '));
    hole.setAttribute('cx', sp[0]); hole.setAttribute('cy', sp[1]); hole.setAttribute('rx', sp[2]); hole.setAttribute('ry', sp[3]);
    cam = vb; spot = sp;
  }
  function move(k, instant) {
    if (!svg) return;
    var t = target(k);
    cancelAnimationFrame(raf);
    if (instant || reduce.matches || !cam) { paint(t.vb, t.spot); return; }
    var v0 = cam.slice(), s0 = spot.slice(), t0 = performance.now(), D = 650;
    (function step(now) {
      var p = Math.min(1, (now - t0) / D), e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; // cubic in-out
      paint(v0.map(function (v, j) { return v + (t.vb[j] - v) * e; }), s0.map(function (v, j) { return v + (t.spot[j] - v) * e; }));
      if (p < 1) raf = requestAnimationFrame(step);
    })(t0);
  }
  function select(k, focus, instant) {
    if (!SEAT[k]) return;
    cur = k;
    tabs.forEach(function (b) {
      var on = b.dataset.k === k;
      b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
      if (on) centre(b, instant);
      var p = document.getElementById(b.getAttribute('aria-controls')); if (p) p.hidden = !on;
    });
    lab.textContent = SEAT[k][1];
    move(k, instant);
  }
  // On a phone the tabs are one scrolling row. Scroll the row itself, so the page never jumps to bring it into view.
  function centre(b, instant) {
    if (bar.scrollWidth <= bar.clientWidth) return;
    bar.scrollTo({ left: b.offsetLeft - (bar.clientWidth - b.offsetWidth) / 2, behavior: instant || reduce.matches ? 'auto' : 'smooth' });
  }
  function fade() { // the right-edge fade shows only while there is more to scroll to
    var more = bar.scrollLeft + bar.clientWidth < bar.scrollWidth - 2;
    bar.classList.toggle('more-r', more); bar.classList.toggle('more-l', bar.scrollLeft > 2);
  }
  if (bar) { bar.addEventListener('scroll', fade, { passive: true }); addEventListener('resize', fade); }
  [].forEach.call(root.querySelectorAll('[data-next]'), function (n) {
    n.addEventListener('click', function () {
      var k = n.dataset.next, p = document.getElementById(k);
      select(k); if (history.replaceState) history.replaceState(null, '', '#' + k);
      if (p) { p.scrollIntoView({ block: 'start', behavior: reduce.matches ? 'auto' : 'smooth' }); p.focus({ preventScroll: true }); } // .sc's scroll-margin-top is respected
    });
  });
  tabs.forEach(function (b, i) {
    b.addEventListener('click', function () { select(b.dataset.k); if (history.replaceState) history.replaceState(null, '', '#' + b.dataset.k); });
    b.addEventListener('keydown', function (e) {
      var j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
      if (j === null) return;
      e.preventDefault(); j = (j + tabs.length) % tabs.length; select(tabs[j].dataset.k, true);
      if (history.replaceState) history.replaceState(null, '', '#' + tabs[j].dataset.k);
    });
  });
  var start = (location.hash || '').slice(1);
  draw();
  select(SEAT[start] ? start : first, false, true);
  fade();
  addEventListener('hashchange', function () { var k = location.hash.slice(1); if (SEAT[k]) select(k, false); });
  function redraw() { if (draw()) select(cur, false, true); }
  if (dark.addEventListener) dark.addEventListener('change', redraw); else if (dark.addListener) dark.addListener(redraw);
  var lastW = host.clientWidth, rz = 0;
  function onResize() {
    if (!host.clientWidth || host.clientWidth === lastW) return;
    lastW = host.clientWidth; clearTimeout(rz);
    rz = setTimeout(function () { if (!svg) redraw(); else move(cur, true); }, 120);
  }
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(host); else addEventListener('resize', onResize);
  // The clip (clip/seats.html) drives the camera from its own seekable GSAP timeline through this.
  window.HLR_SEATS = {
    select: select,
    frame: function (a, b, e) { if (!svg) return; var A = target(a), B = target(b); paint(A.vb.map(function (v, j) { return v + (B.vb[j] - v) * e; }), A.spot.map(function (v, j) { return v + (B.spot[j] - v) * e; })); lab.textContent = SEAT[e < 0.5 ? a : b][1]; }
  };
})();
