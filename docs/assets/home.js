/* Homepage (office v2): draws the floor, frames it, and replays the sample week once, with a camera.
   Every effect maps to one events.v1 entry from sample.js (design/07). Nothing moves without an event behind it.
   The whole replay, camera included, is one seekable GSAP timeline, so the clip renderer can step it frame by frame.
   Reduced motion: no autoplay; "Next step" walks the same beats instantly, and the week is listed below. */
(function () {
  var art = document.getElementById('art'), tags = document.getElementById('tags');
  var whenEl = document.querySelector('.now .when'), whatEl = document.querySelector('.now .what');
  var pp = document.getElementById('pp'), nx = document.getElementById('nx'), stepsEl = document.getElementById('steps');
  var mq = matchMedia('(prefers-color-scheme: dark)'), reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CLIP = document.body.getAttribute('data-clip'); // set on the HyperFrames compositions in clip/: the renderer drives the timeline, frame by frame
  if (CLIP) reduce = false;
  var P = FLOOR.P, AN = FLOOR.anchors, SM = window.SAMPLE, lede = document.querySelector('.lede');
  var svg, full, base, cw = 0, ch = 0, phone = false, focus = null, tagW = [], ledeBox = null, nowBox = null, nowNode = document.querySelector('.now'), chipW = 24, loOn = false;
  var weekStart = SM ? SM.week.start.slice(0, 10) : '';
  var vetoesBefore = SM ? SM.events.filter(function (e) { return e.type === 'chain.dropped' && e.ts < weekStart; }).length : 0;

  var TAGS = [
    { k: 'analyst', n: 1, t: 'Analyst' },
    { k: 'risk', n: 2, t: 'Risk officer' },
    { k: 'committee', n: 3, t: 'Chair' },
    { k: 'sidd', n: 4, t: 'Sidd · portfolio manager', s: 'Sidd · signs' },
    { k: 'record', n: 5, t: 'The record' },
    { k: 'scripts', t: 'Scripts', quiet: true }
  ];
  tags.innerHTML = TAGS.map(function (g) {
    return '<li class="tag' + (g.quiet ? ' quiet' : '') + (g.d === 'below' ? ' below' : '') + '" data-k="' + g.k + '">' + (g.n ? '<b>' + g.n + '</b>' : '') +
      '<span data-t="' + g.t + '"' + (g.s ? ' data-s="' + g.s + '"' : '') + '>' + g.t + '</span></li>';
  }).join('');
  var SHOWS = { desks: ['analyst', 'risk'], veto: [] }; // in the veto close-up the caption names the desk; a tag would sit on the card

  // ---------- framing ----------
  function draw() {
    full = FLOOR.build(art, mq.matches, { vetoes: vetoesBefore }).vb.map(Number);
    svg = art.querySelector('svg');
    var ttl = svg.querySelector('title'); if (ttl) ttl.remove(); // a title shows as a hover tooltip over the replay; the week list carries the detail
    svg.removeAttribute('aria-labelledby'); svg.setAttribute('aria-label', 'The office on two floors, where the sample week plays');
    svg.style.overflow = 'visible'; svg.style.transformOrigin = '0 0';
    shown = '';
  }
  function fit(v) {
    if (!cw || !ch) return v; // every view matches the container's shape, so the camera is a plain translate and scale
    var a = cw / ch, cx = v[0] + v[2] / 2, cy = v[1] + v[3] / 2, w = v[2], h = v[3];
    if (w / h < a) w = h * a; else h = w / a;
    return [cx - w / 2, cy - h / 2, w, h];
  }
  function baseView() {
    if (phone) { // a portrait cut along the path a call takes
      var a = AN.analyst, r = AN.record, sd = AN.sidd, x0 = r[0] - 100, x1 = sd[0] + 95, w = x1 - x0, h = w * ch / cw, cy = (Math.min(r[1], sd[1]) + a[1]) / 2 + 30; // record wall to Sidd's office: the whole path of a call, his desk included
      return [x0, cy - h / 2, w, h];
    }
    if (CLIP) { // no headline to clear: frame the building itself, centred
      var cx0 = (AN.record[0] + AN.sidd[0]) / 2, w0 = (AN.sidd[0] - AN.record[0]) * 1.0, cy0 = (AN.record[1] + AN.analyst[1]) / 2 + 20;
      return fit([cx0 - w0 / 2, cy0 - w0 * 0.4, w0, w0 * 0.8]);
    }
    var z = 0.95, nw = full[2] * z, nh = full[3] * z; // pushed in: the building sits right of the headline and the empty front floor crops away
    return fit([full[0] + (full[2] - nw) * 0.35 - full[2] * 0.19, full[1] + (full[3] - nh) * 0.3, nw, nh]);
  }
  var ZOOM = { record: [0.32, 0.3], veto: [0.3, 0.3], desks: [0.55, 0.53], committee: [0.42, 0.52], sidd: [0.22, 0.3] };
  function focusView(k) {
    var desk = P.apply(null, FLOOR.spots.sidd); // the stamp shot frames Sidd and the card he signs
    var p = k === 'desks' ? [(AN.analyst[0] + AN.risk[0]) / 2, (AN.analyst[1] + AN.risk[1]) / 2] : k === 'veto' ? AN.risk : k === 'sidd' ? [(AN.sidd[0] + desk[0]) / 2, (AN.sidd[1] + desk[1]) / 2] : AN[k];
    var w = base[2] * ZOOM[k][phone ? 1 : 0], h = w * ch / cw, shift = phone || CLIP ? 0 : w * (k === 'sidd' ? 0.14 : 0.2); // the subject sits right of centre, clear of the headline
    return [p[0] - w / 2 - shift, p[1] + (k === 'record' ? (phone ? 100 : 30) : 40) - h / 2, w, h];
  }

  // ---------- camera: the viewBox is written once per move; the move itself is a CSS transform ----------
  var cam = { x: 0, y: 0, w: 1, h: 1 }, shown = '', chipAt = { x: -10, y: -18 }, ledeHold = true; // chipAt: where the call's chip sits over its card
  var last = null;
  function cur() { return last || base; }
  function apply(dest) {
    last = dest;
    if (!cw || !ch || !cam.w) return; // a hidden or zero-size box: nothing to frame yet (it would write Infinity)
    var key = dest.map(function (n) { return n.toFixed(1); }).join(' ');
    if (shown !== key) { svg.setAttribute('viewBox', key); shown = key; }
    var k = cw / cam.w, s = dest[2] / cam.w, tx = -(cam.x - dest[0]) * k, ty = -(cam.y - dest[1]) * k;
    svg.style.transform = Math.abs(s - 1) < 1e-4 && Math.abs(tx) < 0.05 && Math.abs(ty) < 0.05 ? '' : 'translate(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px) scale(' + s.toFixed(5) + ')';
    var cg = svg.querySelector('#fx-chip');
    if (cg) cg.setAttribute('transform', 'scale(' + ((CLIP === 'feed' ? 20 : CLIP ? 13 : 11) / (5.6 * k * CARD())).toFixed(4) + ') translate(' + chipAt.x.toFixed(1) + ',' + chipAt.y.toFixed(1) + ')');
    placeTags();
  }
  function placeTags() {
    var placed = [], k = cw / cam.w, show = focus && (SHOWS[focus] || [focus]);
    [].forEach.call(tags.children, function (li, i) {
      var key = li.getAttribute('data-k'), p = AN[key], x = (p[0] - cam.x) * k, y = (p[1] - cam.y) * k;
      var off = x < 0 || x > cw, quiet = li.classList.contains('quiet');
      li.hidden = (off && quiet) || y < 0 || y > ch || (phone && quiet) || (!!focus && off) || (!!CLIP && !!focus);
      li.classList.toggle('edge', off && !quiet && !focus);
      li.classList.toggle('dim', !!show && show.indexOf(key) < 0);
      li.setAttribute('data-dir', x < 0 ? 'l' : 'r');
      var half = tagW[i] / 2, nxp = Math.max(8 + half, Math.min(cw - 8 - half, x));
      li.style.setProperty('--lx', (x - nxp + half).toFixed(1) + 'px');
      placed.push({ li: li, x: nxp, y: Math.max(y, 46), w: tagW[i] }); // a tag sits above its anchor: keep it inside the frame
    });
    // collisions: a tag that would overlap one above it moves up a row, so two labels never stack
    placed.filter(function (t) { return !t.li.hidden && !t.li.classList.contains('dim'); }).sort(function (a, b) { return a.y - b.y; }).forEach(function (t, j, arr) {
      for (var m = 0; m < j; m++) { var o = arr[m]; if (Math.abs(o.x - t.x) < (o.w + t.w) / 2 + 6 && Math.abs(o.y - t.y) < 30) t.y = o.y + 30; }
    });
    // the headline, the caption and the call chip win: a tag they would cover stays hidden (boxes are cached; only the chip is computed, from the camera)
    var lo = ledeBox && lede && !phone ? +(window.gsap ? gsap.getProperty(lede, 'opacity') : 1) : 0;
    if ((lo > 0.05) !== loOn) { loOn = lo > 0.05; if (loOn) readBoxes(); } // the headline's opacity just crossed: refresh its box
    var hide = [];
    if (lo > 0.05) hide.push(ledeBox);
    if (nowBox) hide.push(nowBox);
    var cb = chipBox(k); if (cb) hide.push(cb);
    if (hide.length) placed.forEach(function (t) {
      if (t.li.hidden) return;
      var edge = t.li.classList.contains('edge'), top = edge ? t.y - 12 : t.y - 40, bot = edge ? t.y + 12 : t.y - 16;
      for (var m = 0; m < hide.length; m++) { var b = hide[m]; if (t.x - t.w / 2 < b[2] && t.x + t.w / 2 > b[0] && top < b[3] && bot > b[1]) { t.li.hidden = true; return; } }
    });
    placed.forEach(function (t) { t.li.style.left = t.x.toFixed(1) + 'px'; t.li.style.top = t.y.toFixed(1) + 'px'; });
  }
  function readBoxes() { // headline and caption boxes, relative to the art; read on layout changes, never per frame
    var box = art.getBoundingClientRect(), pad = function (n) { var r = n.getBoundingClientRect(); return [r.left - box.left - 6, r.top - box.top - 6, r.right - box.left + 6, r.bottom - box.top + 6]; };
    if (lede) ledeBox = pad(lede);
    if (nowNode) nowBox = pad(nowNode);
  }
  function chipBox(k) { // the call chip is a fixed-size label on the card: its box follows from the card's place and the camera
    if (!window.gsap || !svg || typeof pos === 'undefined') return null;
    var card = svg.querySelector('#fx-card'), cg = svg.querySelector('#fx-chip');
    if (!card || !cg || gsap.getProperty(card, 'opacity') < 0.05 || gsap.getProperty(cg, 'opacity') < 0.05) return null;
    var p = P(pos.x, pos.y, pos.bz + pos.lift), u = (CLIP === 'feed' ? 20 : CLIP ? 13 : 11) / 5.6, cx = (p[0] - cam.x) * k + chipAt.x * u, cy = (p[1] - cam.y) * k + chipAt.y * u;
    return [cx - chipW / 2 * u - 6, cy - 6 * u - 6, cx + chipW / 2 * u + 6, cy + 3 * u + 6];
  }
  function measure() {
    var box = art.getBoundingClientRect();
    readBoxes();
    cw = box.width; ch = box.height; phone = cw < 640;
    tags.style.left = art.offsetLeft + 'px'; tags.style.top = art.offsetTop + 'px'; tags.style.width = cw + 'px'; tags.style.height = ch + 'px';
    tags.classList.toggle('phone', phone);
    [].forEach.call(tags.querySelectorAll('span[data-s]'), function (sp) { sp.textContent = phone ? sp.dataset.s : sp.dataset.t; });
    [].forEach.call(tags.children, function (li, i) { var h = li.hidden; li.hidden = false; tagW[i] = li.offsetWidth; li.hidden = h; }); // read once, not per frame
    base = baseView();
  }
  function rest(v) { cam.x = v[0]; cam.y = v[1]; cam.w = v[2]; cam.h = v[3]; apply(v); }
  draw(); measure(); rest(base);
  if (!window.gsap || !SM) return; // the still frame stands on its own

  // ---------- the beats, read from events.v1 ----------
  function rowOf(e) { return SM.rows.filter(function (r) { return e.ref === r.id || (r.chain || []).indexOf(e.id) > -1; })[0] || {}; }
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function when(ts) {
    if (ts.length === 10) return DAYS[new Date(ts + 'T12:00:00Z').getUTCDay()];
    return new Date(ts).toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: '2-digit' }).replace(',', '') + ' ET';
  }
  var SAY = {
    'row.closed': function (e, r) { return 'No. ' + r.id.slice(2) + ' closes as a ' + r.outcome + '. It stays up, full size.'; },
    'note.drafted': function () { return 'The analyst flags an unusual move. Its ticker stays private.'; },
    'chain.dropped': function (e) { return (e.stage === 'risk' ? 'The risk officer vetoes an idea.' : 'The chair turns an idea down.') + ' Its ticker is never published.'; },
    'memo.drafted': function (e, r) { return 'The analyst writes a memo on ' + r.ticker + '.'; },
    'memo.forwarded': function () { return 'A script hands it to the risk officer.'; },
    'risk.reviewed': function () { return 'The risk officer passes it, with a written dissent.'; },
    'decision.made': function (e, r) { return 'The chair decides to publish: ' + r.ticker + ', ' + r.direction + ', ' + r.months + ' months.'; },
    'approval.stamped': function () { return 'I sign it. Nothing publishes without my signature.'; },
    'row.published': function (e, r) { return 'Published as No. ' + r.id.slice(2) + ', before anyone knows the outcome.'; }
  };
  var SHORT = { // the clip's captions: one idea each, readable in a phone feed
    'row.closed': 'A call closes at a loss. It stays up.', 'chain.dropped': 'Vetoed. Its ticker stays private.',
    'memo.drafted': 'The analyst writes a memo.', 'memo.forwarded': 'A script forwards it to risk.', 'risk.reviewed': 'Risk passes it, with a dissent.',
    'decision.made': 'The chair decides.', 'approval.stamped': 'I sign. Nothing publishes without it.', 'row.published': 'Published before anyone knows the outcome.'
  };
  var all = SM.events.filter(function (e) { return e.ts >= weekStart && e.ts <= SM.week.end && SAY[e.type]; })
    .map(function (e) { var r = rowOf(e); return { e: e, r: r, when: when(e.ts), what: SAY[e.type](e, r), short: SHORT[e.type] }; });
  var beats = all.filter(function (s) { return s.e.type !== 'note.drafted'; }); // a note leads nowhere on screen; it stays in the list
  var by = function (t) { return beats.filter(function (s) { return s.e.type === t; }); };
  var lossN = by('row.closed').filter(function (s) { return s.r.outcome === 'loss'; }).length, closeN = by('row.closed').length;
  var plural = function (n, one, many) { return n + '\u00a0' + (n === 1 ? one : many); }, vetoN = by('chain.dropped').length, signN = by('approval.stamped').length;
  var NUM = ['no', 'one', 'two', 'three', 'four', 'five'], word = function (n) { return NUM[n] || String(n); };
  var intro = { when: 'Mon', what: 'Play a sample week: ' + word(vetoN) + (vetoN === 1 ? ' idea' : ' ideas') + ' vetoed, ' + (lossN ? word(lossN) + (lossN === 1 ? ' loss' : ' losses') + ' kept' : word(closeN) + (closeN === 1 ? ' call' : ' calls') + ' closed') + ', ' + word(signN) + (signN === 1 ? ' call' : ' calls') + ' signed.', short: 'One sample week, Monday to Sunday.' }; // counts come from the sample events, never typed
  var outro = { when: 'The week', what: 'This week: ' + plural(vetoN, 'idea', 'ideas') + ' vetoed, ' +
    (lossN ? plural(lossN, 'loss', 'losses') + ' left up' : plural(closeN, 'call', 'calls') + ' closed') + ', ' + plural(signN, 'call', 'calls') + ' signed.' };
  stepsEl.innerHTML = all.map(function (s) { return '<li><span class="mono">' + s.when + '</span> ' + s.what + ' <span class="muted xs">' + s.e.type + ' &middot; ' + s.e.id + '</span></li>'; }).join('');

  // ---------- the memo card: it collects its history as it moves ----------
  var K = FLOOR.K, C = 0.8660254, S = FLOOR.S;
  function q(pts) { return pts.map(function (p) { var v = P(p[0], p[1], p[2] || 0); return v[0].toFixed(1) + ',' + v[1].toFixed(1); }).join(' '); }
  function flat(x, y, txt, size, fill, deg, weight) { // text lying on the paper
    var t = (deg || 0) * Math.PI / 180, c = Math.cos(t), s = Math.sin(t), a = [c * C - s * C, c * 0.5 + s * 0.5], b = [-s * C - c * C, -s * 0.5 + c * 0.5], o = P(x, y, 0);
    return '<text transform="matrix(' + a[0].toFixed(4) + ',' + a[1].toFixed(4) + ',' + b[0].toFixed(4) + ',' + b[1].toFixed(4) + ',' + o[0].toFixed(1) + ',' + o[1].toFixed(1) + ')" font-family="IBM Plex Mono, monospace" font-size="' + size + '" font-weight="' + (weight || 600) + '" fill="' + fill + '" text-anchor="middle">' + txt + '</text>';
  }
  function rot(pts, deg) { var t = deg * Math.PI / 180, c = Math.cos(t), s = Math.sin(t); return pts.map(function (p) { return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; }); }
  var strikeA = P(-0.42, 0.55, 0), strikeB = P(0.42, -0.5, 0), strikeLen = Math.hypot(strikeB[0] - strikeA[0], strikeB[1] - strikeA[1]);
  function buildFx() {
    svg.querySelector('#fl-fx').innerHTML =
      '<ellipse id="fx-shadow" rx="15" ry="8" fill="#3a2a18" opacity="0"/>' +
      '<g id="fx-card" opacity="0"><g id="fx-inner">' +
      '<polygon points="' + q([[0.12, -0.9], [0.5, -0.9], [0.5, -0.5], [0.12, -0.5]]) + '" id="fx-dissent" opacity="0" fill="' + K.tab + '" stroke="#B89A5A" stroke-width="0.5"/>' +
      '<polygon points="' + q([[-0.5, -0.65], [0.5, -0.65], [0.5, 0.65], [-0.5, 0.65]]) + '" fill="' + K.paper + '" stroke="#8C8579" stroke-width="0.8"/>' +
      '<polygon points="' + q([[-0.45, -0.58], [0.45, -0.58], [0.45, -0.42], [-0.45, -0.42]]) + '" fill="' + K.ink + '"/>' +
      [-0.22, -0.06, 0.1].map(function (yy) { return '<polygon points="' + q([[-0.38, yy], [0.3, yy], [0.3, yy + 0.05], [-0.38, yy + 0.05]]) + '" fill="#CFC8BB"/>'; }).join('') +
      '<line id="fx-strike" x1="' + strikeA[0].toFixed(1) + '" y1="' + strikeA[1].toFixed(1) + '" x2="' + strikeB[0].toFixed(1) + '" y2="' + strikeB[1].toFixed(1) + '" stroke="' + K.loss + '" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="' + strikeLen.toFixed(1) + '" stroke-dashoffset="' + strikeLen.toFixed(1) + '"/>' +
      '<g id="fx-ink" opacity="0"><polygon points="' + q(rot([[-0.46, 0.08], [0.46, 0.08], [0.46, 0.58], [-0.46, 0.58]], -4)) + '" fill="none" stroke="' + K.ink + '" stroke-width="0.7"/>' +
      flat(0, 0.32, 'APPROVED', 2.8, K.ink, -4, 700) + flat(0, 0.49, 'SIDD · SUN 6:14 PM', 1.4, K.ink, -4, 600) + '</g>' +
      '<polygon id="fx-ring" opacity="0" points="' + q(rot([[-0.48, 0.05], [0.48, 0.05], [0.48, 0.61], [-0.48, 0.61]], -4)) + '" fill="none" stroke="' + K.ink + '" stroke-width="1"/>' +
      '<g id="fx-flecks" opacity="0">' + [[-0.42, 0.05], [0.44, 0.2], [0.3, 0.6], [-0.3, 0.6], [0.47, 0.42], [-0.46, 0.38]].map(function (f, j) { var v = P(f[0], f[1], 0); return '<circle cx="' + v[0].toFixed(1) + '" cy="' + v[1].toFixed(1) + '" r="' + (0.6 + (j % 3) * 0.3) + '" fill="' + K.ink + '"/>'; }).join('') + '</g>' +
      '</g><g id="fx-chip"><rect id="fx-chip-bg" x="-14" y="-6" width="28" height="9" rx="1.5" fill="' + K.paper + '" stroke="#8C8579" stroke-width="0.5"/>' +
      '<rect id="fx-redact" x="-9" y="-3.6" width="18" height="4.4" fill="#1C1B19" opacity="0"/>' +
      '<text id="fx-tk" x="0" y="0.6" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="5.6" font-weight="600" fill="#1C1B19"></text></g></g>';
  }
  buildFx();
  function lift() { // the stamp must land on top of the card, and his hand stays on top of the stamp
    var fx = svg.querySelector('#fl-fx'); ['fl-stamp', 'fl-arm'].forEach(function (id) { var n = svg.querySelector('#' + id); if (n && n.parentNode !== fx) fx.appendChild(n); });
  }
  lift();
  function el(id) { return svg.querySelector('#' + id); }
  function chip(txt, redact) {
    var t = el('fx-tk'), bg = el('fx-chip-bg'), w = Math.max(24, (redact ? 18 : txt.length * 3.45) + 10);
    chipW = w; t.textContent = txt; bg.setAttribute('x', -w / 2); bg.setAttribute('width', w); el('fx-redact').setAttribute('opacity', redact ? 1 : 0);
  }
  var pos = { x: 0, y: 0, bz: 1.5, lift: 0 }, grip = { v: 0 };
  function CARD() { return phone ? 1.6 : 1.4; } // the memo card is drawn larger than the furniture so its stamp reads
  function idle() { // two-frame life while the week plays: model hands type. Read from the playhead, so it pauses and seeks with everything else.
    var t = tl.time();
    [].forEach.call(svg.querySelectorAll('.ih'), function (n, i) { n.setAttribute('transform', 'translate(0,' + ((Math.floor(t * 5) + i) % 2 ? -1.2 : 0) + ')'); });
  }
  function armSync() { // Sidd's hand: at rest on the desk, or on the stamp handle wherever the stamp is. floor.js draws the arm at a fixed length.
    var A = FLOOR.arm, arm = el('fl-arm'), stp = el('fl-stamp');
    if (!A.sh || !arm || !stp) return;
    var h = P(SPOT.stamp[0], SPOT.stamp[1], SPOT.stamp[2] + 0.6), sx = +gsap.getProperty(stp, 'x') || 0, sy = +gsap.getProperty(stp, 'y') || 0;
    var hx = A.rest[0] + (h[0] + sx - A.rest[0]) * grip.v, hy = A.rest[1] + (h[1] + sy - A.rest[1]) * grip.v, at = hx.toFixed(1) + ',' + hy.toFixed(1);
    if (arm.getAttribute('data-at') === at) return;
    arm.setAttribute('data-at', at); arm.innerHTML = FLOOR.armSVG(hx, hy);
  }
  function placeCard() {
    var p = P(pos.x, pos.y, pos.bz + pos.lift), g = P(pos.x, pos.y, pos.bz), c = el('fx-card'), sh = el('fx-shadow');
    c.setAttribute('transform', 'translate(' + p[0].toFixed(1) + ',' + p[1].toFixed(1) + ')' + ' scale(' + CARD() + ')');
    var l = Math.max(0, pos.lift);
    sh.setAttribute('cx', g[0].toFixed(1)); sh.setAttribute('cy', g[1].toFixed(1));
    sh.setAttribute('rx', (15 * (1 - l * 0.22)).toFixed(1)); sh.setAttribute('ry', (8 * (1 - l * 0.22)).toFixed(1));
    sh.setAttribute('opacity', (+c.getAttribute('opacity') > 0 ? 0.16 * (1 - l * 0.35) : 0).toFixed(3));
  }
  var SPOT = FLOOR.spots, TRAY = [SPOT.tray[0], SPOT.tray[1], FLOOR.trayTop()];

  // ---------- the timeline ----------
  var tl, done = false;
  var caps = [], capOn = null;
  var STN = { 'memo.drafted': 1, 'memo.forwarded': 2, 'risk.reviewed': 2, 'chain.dropped': 2, 'decision.made': 3, 'approval.stamped': 4, 'row.published': 5, 'row.closed': 5 };
  var ICON = { pause: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="2" width="3.5" height="12" fill="currentColor"/><rect x="9.5" y="2" width="3.5" height="12" fill="currentColor"/></svg>', play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2l10 6-10 6z" fill="currentColor"/></svg>' };
  function btn(state) { // pause and play are icons; the end of the week is a sentence
    pp.classList.toggle('icon', state !== 'replay');
    pp.innerHTML = state === 'replay' ? 'Replay the week' : ICON[state];
    pp.setAttribute('aria-label', state === 'pause' ? 'Pause' : state === 'play' ? 'Play' : 'Replay the week');
    var nw = document.querySelector('.now'); if (nw) nw.setAttribute('aria-live', state === 'pause' ? 'off' : 'polite'); // quiet while playing
  }
  btn('pause');
  var endEl = document.getElementById('endcard');
  function ended(on) { // the week is over: the card offers the next page and the person behind it
    if (!endEl || CLIP) return;
    endEl.hidden = !on; var nw = document.querySelector('.now'); if (nw) nw.classList.toggle('ended', on);
  }
  var ticks = document.querySelectorAll('.now .ticks li');
  var nowEl = document.querySelector('.now');
  function show(s) {
    if (capOn === s) return; capOn = s;
    if (nowEl) nowEl.setAttribute('aria-live', tl && !tl.paused() && !done ? 'off' : 'polite');
    var n = s.e ? STN[s.e.type] || 0 : 0;
    [].forEach.call(ticks, function (li, i) { li.className = i + 1 === n ? 'on' : i + 1 < n ? 'past' : ''; });
    whenEl.innerHTML = s.when + ' <span>Nov 2–8<i>, 2026</i> · sample</span>'; whatEl.textContent = (CLIP && s.short) || s.what;
    if (!reduce && tl && !tl.paused()) gsap.fromTo(whatEl, { opacity: 0, y: 4 }, { opacity: 1, y: 0, duration: 0.15 });
  }
  function say(s) { return function () { show(s); }; }
  function cap(s, t) { caps.push({ t: t === undefined ? tl.duration() : t, s: s }); return tl; }
  function sync() { var t = tl.time() + 1e-4, c = caps[0]; caps.forEach(function (x) { if (x.t <= t) c = x; }); if (c) show(c.s); }
  function move(k, d, at) { // returns the label where the camera settles
    var dest = k ? fit(focusView(k)) : base;
    tl.to(cam, { x: dest[0], y: dest[1], w: dest[2], h: dest[3], duration: d, ease: 'power3.inOut', onStart: function () { svg.style.willChange = 'transform'; }, onComplete: function () { svg.style.willChange = 'auto'; }, onReverseComplete: function () { svg.style.willChange = 'auto'; }, onUpdate: function () { focus = k; apply(dest); } }, at); // a layer only while moving, so text re-rasterises sharp at rest
    if (lede && !phone && !(k && ledeHold)) tl.to(lede, { opacity: k ? 0 : 1, duration: d * 0.6, ease: 'power1.inOut' }, '<'); // the headline stays through the first two beats
    return dest;
  }
  function hop(to, d, lift, at) {
    tl.to(pos, { x: to[0], y: to[1], bz: to[2], duration: d, ease: 'power2.inOut', onUpdate: placeCard }, at)
      .to(pos, { lift: lift, duration: d / 2, ease: 'power1.out', yoyo: true, repeat: 1, onUpdate: placeCard }, '<')
      .to(pos, { lift: -0.05, duration: 0.06, ease: 'power1.out', onUpdate: placeCard })
      .to(pos, { lift: 0, duration: 0.06, ease: 'power1.in', onUpdate: placeCard });
  }
  function land(spot, label, redact) {
    tl.call(function () { chip(label, redact); })
      .set(pos, { x: spot[0], y: spot[1], bz: spot[2], lift: 0.6, onComplete: placeCard }, '<')
      .to(pos, { lift: 0, duration: 0.45, ease: 'power2.out', onUpdate: placeCard })
      .to(el('fx-card'), { opacity: 1, duration: 0.3, onUpdate: placeCard }, '<');
  }
  function type(from, to, d) {
    var k = 0; while (k < from.length && from[k] === to[k]) k++; // keep what both share, retype the rest
    var head = to.slice(0, k), extra = to.slice(k), n = { i: 0 };
    tl.to(n, { i: extra.length, duration: d, ease: 'steps(' + Math.min(6, extra.length) + ')', onUpdate: function () { chip(head + extra.slice(0, Math.round(n.i))); } });
  }
  function flip(outEl, inEl, center) {
    var o = center[0].toFixed(1) + ' ' + center[1].toFixed(1);
    tl.to(outEl, { scaleY: 0, duration: 0.16, ease: 'power2.in', svgOrigin: o })
      .set(outEl, { opacity: 0 })
      .fromTo(inEl, { scaleY: 0, opacity: 1 }, { immediateRender: false, scaleY: 1, duration: 0.2, ease: 'power2.out', svgOrigin: o });
  }
  var LB = {}; // label times, kept by hand: HyperFrames wraps the timeline and hides its own labels
  function lab(n) { LB[n] = tl.duration(); tl.addLabel(n); return tl; }
  function build() {
    LB = {}; ledeHold = true;
    if (tl) tl.kill();
    done = false; ended(false); focus = null; rest(base);
    caps = []; capOn = null;
    tl = gsap.timeline({ paused: true, onUpdate: function () { sync(); armSync(); idle(); placeTags(); }, onComplete: function () { done = true; btn('replay'); ended(true); } });
    var c3 = FLOOR.centers['C-3'], c6 = FLOOR.centers['C-6'];
    // the week opens before any of its events: No. 3 still open, No. 6 not yet on the wall, no memo on any desk
    if (lede) tl.set(lede, { opacity: 1 }, 0);
    tl.set(el('fl-c-C-3-pre'), { opacity: 1, scaleY: 1, svgOrigin: c3[0] + ' ' + c3[1] }, 0)
      .set(el('fl-c-C-3'), { scaleY: 0, svgOrigin: c3[0] + ' ' + c3[1] }, 0)
      .set(el('fl-c-C-6'), { scaleY: 0, svgOrigin: c6[0] + ' ' + c6[1] }, 0)
      .set([el('fl-memo-risk'), el('fl-memo-sidd'), el('fx-card'), el('fx-dissent'), el('fx-ink'), el('fl-veto-new')], { opacity: 0 }, 0)
      .set(el('fx-inner'), { scaleY: 1, rotation: 0, transformOrigin: '50% 50%' }, 0)
      .set(el('fx-chip'), { opacity: 1 }, 0).set([el('fx-flecks'), el('fx-ring'), el('fl-m3-ring')], { opacity: 0 }, 0).set(grip, { v: 0 }, 0).set(chipAt, { x: -10, y: -18 }, 0).set([el('fl-rail'), el('fl-sglass')], { opacity: 1 }, 0)
      .set(el('fx-strike'), { attr: { 'stroke-dashoffset': strikeLen } }, 0)
      .set(el('fl-stamp'), { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 }, 0)
      
      .to({}, { duration: 1.3 }); // a short look at the wide shot, headline up, before the first move
    cap(intro, 0);

    beats.forEach(function (s, i) {
      var t = s.e.type, r = s.r;
      lab('s' + i);
      if (t === 'row.closed') { // the loss: settle, a beat of stillness, the flip, the longest hold
        move('record', 0.8); cap(s).to({}, { duration: 0.15 });
        flip(el('fl-c-' + r.id + '-pre'), el('fl-c-' + r.id), FLOOR.centers[r.id]);
        tl.to({}, { duration: 0.8 });
      } else if (t === 'chain.dropped') { // the veto: tight on the risk desk, an ink strike, into the stack
        move('veto', 0.8); cap(s);
        land(SPOT.risk, '', true);
        tl.to(el('fx-strike'), { attr: { 'stroke-dashoffset': 0 }, duration: 0.22, ease: 'power2.out' }).call(function () { chip('VETOED'); }).to({}, { duration: 0.3 });
        hop(TRAY, 0.45, 0.5);
        tl.to(el('fx-card'), { opacity: 0, duration: 0.2, onUpdate: placeCard }).to(el('fl-veto-new'), { opacity: 1, duration: 0.2 }, '<').to({}, { duration: 0.1 });
        tl.set(el('fx-strike'), { attr: { 'stroke-dashoffset': strikeLen } });
      } else if (t === 'memo.drafted') { // analyst, forward and risk play as one shot of the two desks
        ledeHold = false;
        move('desks', 0.8); cap(s);
        land(SPOT.analyst, r.ticker); tl.to({}, { duration: 0.6 }); // the first model seat gets a beat a reader can see
      } else if (t === 'memo.forwarded') {
        cap(s); hop(SPOT.risk, 0.7, 1.2);
      } else if (t === 'risk.reviewed') {
        cap(s).fromTo(el('fx-dissent'), { opacity: 0, y: 3 }, { immediateRender: false, opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' });
        type(r.ticker, r.ticker + ' · dissent', 0.3); tl.to({}, { duration: 0.4 });
      } else if (t === 'decision.made') { // the card leads; the camera lands just after it
        lab('c' + i); hop(SPOT.committee, 0.7, 1.6, 'c' + i); move('committee', 0.8, 'c' + i + '+=0.1');
        tl.fromTo(el('fl-m3-ring'), { opacity: 0 }, { immediateRender: false, keyframes: [{ opacity: 1, duration: 0.2 }, { opacity: 0.35, duration: 0.3 }, { opacity: 0, duration: 0.2 }] }, 'c' + i + '+=0.4');
        cap(s); type(r.ticker + ' · dissent', r.ticker + ' · ' + r.direction.toUpperCase() + ' · ' + r.months + 'M', 0.3); tl.to({}, { duration: 0.4 });
      } else if (t === 'approval.stamped') { // the one physical beat in the piece
        lab('c' + i); hop(SPOT.sidd, 0.7, 1.8, 'c' + i); var dest = move('sidd', 0.8, 'c' + i + '+=0.1');
        var st = P.apply(null, SPOT.stamp), cp = P(SPOT.sidd[0], SPOT.sidd[1], SPOT.sidd[2] + 0.04), dx = cp[0] - st[0], dy = cp[1] - st[1];
        var push = [dest[0] + dest[2] * 0.015, dest[1] + dest[3] * 0.015, dest[2] * 0.97, dest[3] * 0.97], a = 3 * dest[2] / cw;
        var px = dest[2] / cw, rail = [el('fl-rail'), el('fl-sglass')]; // one screen pixel, in scene units at this framing
        tl.to(rail, { opacity: 0.15, duration: 0.3 }, 'c' + i + '+=0.4'); // the railing steps back for the beat
        tl.to(chipAt, { x: phone ? -22 : -44, y: -30, duration: 0.3, ease: 'power2.inOut', onUpdate: function () { apply(cur()); } }, 'c' + i + '+=0.5'); // the call stays readable under his arm
        tl.to(grip, { v: 1, duration: 0.25, ease: 'power2.inOut' }); // his hand goes to the stamp first; from here the stamp moves only in his hand
        lab('t0'); LB.hit = LB.t0 + 0.44;
        tl.to(el('fx-chip'), { opacity: 0, duration: 0.15 }, 't0')
          .to(el('fl-stamp'), { x: dx, y: dy - 8 * px, rotation: -4, transformOrigin: '50% 100%', duration: 0.3, ease: 'power2.inOut' }, 't0')
          .to(cam, { x: push[0], y: push[1], w: push[2], h: push[3], duration: 0.44, ease: 'sine.inOut', onUpdate: function () { apply(push); } }, 't0')
          .to(el('fl-stamp'), { y: dy, rotation: 0, duration: 0.09, ease: 'power4.in', transformOrigin: '50% 100%' }, 't0+=0.35')
          .addLabel('hit', 't0+=0.44')
          .to(el('fl-stamp'), { keyframes: [{ scaleX: 1.08, scaleY: 0.85, duration: 0.066 }, { scaleX: 1, scaleY: 1, duration: 0.12, ease: 'back.out(3)' }], transformOrigin: '50% 100%' }, 'hit')
          .to(pos, { keyframes: [{ lift: -0.08, duration: 0.05 }, { lift: 0, duration: 0.07 }], onUpdate: placeCard }, 'hit')
          .fromTo(el('fx-inner'), { scaleY: 0.96, x: 0 }, { immediateRender: false, keyframes: [{ scaleY: 1, x: 2 * px, duration: 0.04 }, { x: -2 * px, duration: 0.04 }, { x: 0, duration: 0.04 }], transformOrigin: '50% 50%' }, 'hit') // the paper flexes and shivers
          .to(cam, { keyframes: [{ y: push[1] - a, duration: 0.035 }, { y: push[1] + a / 2, duration: 0.035 }, { y: push[1] - a / 4, duration: 0.035 }, { y: push[1], duration: 0.035 }], ease: 'none', onUpdate: function () { apply(push); } }, 'hit')
          .fromTo(el('fx-ink'), { opacity: 1, scale: 1.15, transformOrigin: '50% 50%' }, { immediateRender: false, opacity: 1, scale: 1, duration: 0.15, ease: 'power2.out', transformOrigin: '50% 50%' }, 'hit')
          .fromTo(el('fx-flecks'), { opacity: 0.9 }, { immediateRender: false, opacity: 0, duration: 0.5, ease: 'power1.in' }, 'hit')
          .fromTo(el('fx-ring'), { opacity: 0.7, scale: 1, transformOrigin: '50% 50%' }, { immediateRender: false, opacity: 0, scale: 1.25, duration: 0.3, ease: 'power2.out', transformOrigin: '50% 50%' }, 'hit')
          .to(el('fl-stamp'), { y: dy - 14 * px, duration: 0.22, ease: 'power2.out' }, 'hit+=0.3')
          .to(el('fl-stamp'), { x: 0, y: 0, duration: 0.25, ease: 'power2.inOut' })
          .to(grip, { v: 0, duration: 0.2, ease: 'power2.inOut' })
          .to(el('fx-chip'), { opacity: 1, duration: 0.2 }, 'hit+=0.35')
          .to(rail, { opacity: 1, duration: 0.25 }, '<')
          .to({}, { duration: 0.1 });
        cap(s, LB.t0); // the caption names the signature as the stamp lifts
      } else if (t === 'row.published') { // the same card lands on the wall and turns into the record
        var slot = FLOOR.slots[r.id];
        tl.to(chipAt, { x: -10, y: -18, duration: 0.2, onUpdate: function () { apply(cur()); } });
        lab('c' + i); hop(slot, 0.7, 1.0, 'c' + i); move('record', 0.8, 'c' + i + '+=0.1');
        cap(s);
        tl.to(el('fx-chip'), { opacity: 0, duration: 0.15 }).to(el('fx-inner'), { rotation: -60, duration: 0.2, ease: 'power2.out', transformOrigin: '50% 50%' }) // floor plane to wall plane: a -60° turn in this projection
          .to(el('fx-inner'), { scaleY: 0, duration: 0.16, ease: 'power2.in', transformOrigin: '50% 50%' }).set(el('fx-card'), { opacity: 0, onComplete: placeCard })
          .fromTo(el('fl-c-' + r.id), { scaleY: 0 }, { immediateRender: false, scaleY: 1, duration: 0.2, ease: 'power2.out', svgOrigin: FLOOR.centers[r.id][0] + ' ' + FLOOR.centers[r.id][1] });
        tl.to({}, { duration: 0.6 });
      }
      lab('e' + i);
    });
    move(null, 0.9); cap(outro); tl.call(function () { focus = null; placeTags(); }).to({}, { duration: 0.3 });
    caps.sort(function (a, b) { return a.t - b.t; });
  }
  build();

  // ---------- controls ----------
  var at = -1;
  if (CLIP) { // the launch cut: a cold open on the signature, the week at speed, an end card. It replays the same timeline in segments.
    var B = {}; beats.forEach(function (b, i) { B[b.e.type] = i; });
    var seg = function (from, to, speed) { cut.set(tl, { time: from }).to(tl, { time: to, duration: (to - from) / speed, ease: 'none' }); };
    var ov = function (id) { return document.getElementById(id); };
    var cut = gsap.timeline({ paused: true });
    cut.set(ov('end'), { opacity: 0 }, 0).set(ov('cold1'), { opacity: 1 }, 0).set(document.querySelector('.now'), { opacity: 0 }, 0);
    seg(LB.hit - 0.75, LB.hit + 0.7, 1);
    cut.to(ov('cold1'), { opacity: 0, duration: 0.3 }, 1.25).to(document.querySelector('.now'), { opacity: 1, duration: 0.2 }, 1.45);
    seg(LB.s0 - 0.6, LB['e' + B['row.closed']] - 0.4, 1.3);
    seg(LB['s' + B['chain.dropped']], LB['e' + B['chain.dropped']] - 0.3, 1.3);
    seg(LB['s' + B['memo.drafted']], LB['e' + B['risk.reviewed']] - 0.2, 1.35);
    seg(LB['s' + B['decision.made']], LB['e' + B['decision.made']] - 0.4, 1.3);
    seg(LB['s' + B['approval.stamped']], LB['e' + B['approval.stamped']] - 0.3, 1.15);
    seg(LB['s' + B['row.published']], LB['e' + B['row.published']] - 0.2, 1.2);
    cut.to(document.querySelector('.now'), { opacity: 0, duration: 0.2 }).to(ov('end'), { opacity: 1, duration: 0.3 }, '<').to({}, { duration: 1.6 });
    window.__timelines = window.__timelines || {}; window.__timelines[CLIP] = cut;
    window.HLR_CUT = cut.duration();
  } else if (reduce) {
    pp.hidden = true; nx.hidden = false;
    document.getElementById('stepsbox').open = true;
    tl.progress(1); rest(base); focus = null; placeTags();
    say({ when: 'Motion off', what: 'Motion is off. Use Next step, or read the week as a list below.' })();
    ended(true); // nothing to wait for: the way on is there from the start
    nx.addEventListener('click', function () { at = (at + 1) % beats.length; tl.seek(LB['e' + at] - 0.02, false); nx.textContent = 'Next step (' + (at + 2 > beats.length ? 1 : at + 2) + ' of ' + beats.length + ')'; });
  } else {
    tl.play();
    pp.addEventListener('click', function () {
      if (done) { build(); tl.play(); btn('pause'); return; }
      var p = !tl.paused(); tl.paused(p); // Pause stops all motion: the camera lives inside this timeline
      btn(p ? 'play' : 'pause');
    });
  }

  function rebuild(redraw) {
    var t = tl.time(), wasPaused = tl.paused() || done;
    if (redraw) { draw(); buildFx(); lift(); }
    measure(); build(); tl.seek(t, false);
    if (reduce) ended(true);
    else if (t >= tl.duration() - 1e-3) { done = true; btn('replay'); ended(true); }
    if (!wasPaused && !reduce) tl.play();
  }
  var rz;
  addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { rebuild(false); }, 150); });
  if (window.ResizeObserver) { // a tab opened in the background lays out at 0 first; a height change (the end card) re-frames too
    var seen = cw + 'x' + ch;
    new ResizeObserver(function () { var r = art.getBoundingClientRect(), z = r.width + 'x' + r.height; if (r.width && z !== seen) { seen = z; clearTimeout(rz); rz = setTimeout(function () { rebuild(false); }, 150); } }).observe(art);
    var ro2 = new ResizeObserver(function () { readBoxes(); }); [lede, nowNode].forEach(function (n) { if (n) ro2.observe(n); });
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  if (mq.addEventListener) mq.addEventListener('change', function () { rebuild(true); }); else if (mq.addListener) mq.addListener(function () { rebuild(true); });
  window.HLR = { get tl() { return tl; }, get labels() { return LB; }, beats: beats, steps: all };
})();
