/* How it works: one call's path as tabs over the office. One stop at a time sits in a hard-edged spotlight
   (an SVG mask, no gradient) and its card comes forward. Without JS, every card is listed in order and the
   office stays hidden. No timeline and no autoplay: the camera moves only when the reader picks a tab.
   A tab's data-lab overrides the stage label below; the clip (clip/seats.html) keeps these defaults. */
(function () {
  var root = document.querySelector('[data-seats]');
  if (!root || !window.FLOOR) return;
  var F = window.FLOOR, NS = 'http://www.w3.org/2000/svg';
  var host = root.querySelector('.sc-floor'), lab = root.querySelector('.sc-lab');
  var tabs = [].slice.call(root.querySelectorAll('[role=tab]'));
  var dark = matchMedia('(prefers-color-scheme: dark)'), reduce = matchMedia('(prefers-reduced-motion: reduce)');
  // [anchor, label, camera width in scene px, spotlight rx, ry]
  var SEAT = {
    scripts: ['scripts', 'Scripts · not AI', 380, 120, 120],
    m1: ['analyst', 'M1 · the analyst', 300, 70, 60],
    m2: ['risk', 'M2 · the risk officer', 300, 70, 60],
    m3: ['committee', 'M3 · the chair', 340, 120, 80],
    pm: ['sidd', 'Sidd · portfolio manager', 340, 110, 80],
    publish: ['record', 'Scripts · publish and score', 440, 150, 130],
    bench: ['bench', 'The bench · no seat yet', 460, 190, 110],
    record: ['record', 'The record', 440, 150, 130] // no tab: the clip ends its walk here
  };
  var svg, hole, cam, spot, cur = 'm1', raf = 0, first = tabs.length > 1 ? tabs[0].dataset.k : 'm1';
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
      if (on) { var bar = b.parentNode, L = b.offsetLeft - bar.offsetLeft, R = L + b.offsetWidth; // keep the chosen tab in view on a phone
        if (L < bar.scrollLeft) bar.scrollLeft = L; else if (R > bar.scrollLeft + bar.clientWidth) bar.scrollLeft = R - bar.clientWidth; }
      var p = document.getElementById(b.getAttribute('aria-controls')); if (p) p.hidden = !on;
      if (on && b.dataset.lab) lab.textContent = b.dataset.lab;
    });
    if (!tabs.some(function (b) { return b.dataset.k === k && b.dataset.lab; })) lab.textContent = SEAT[k][1];
    move(k, instant);
  }
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
