/* Seat cards on the homepage office. Each tag on the art is a button (home.js builds them); this opens a small card for the seat:
   Can't, Reads, This week. Refusal first. Facts come from the seven stops on desk.html; the "This week" line is read from sample.js.
   Opening a card pauses the replay (HLR.pause). Closing never resumes it; the play control does.
   Desktop: hover or keyboard focus previews, a click pins; Esc or a click elsewhere closes.
   Phone (coarse pointer or narrow): a bottom sheet with a close button, kept above the caption when there is room.
   Deep link: #seat=analyst|risk|chair|sidd|scripts|record opens that card. */
(function () {
  var tags = document.getElementById('tags'), stage = document.getElementById('office');
  if (!tags || !stage) return;
  var SM = window.SAMPLE, RE = /^#seat=(analyst|risk|chair|sidd|scripts|record)$/;
  var HASH = { analyst: 'analyst', risk: 'risk', committee: 'chair', sidd: 'sidd', scripts: 'scripts', record: 'record' };
  var KEY = { analyst: 'analyst', risk: 'risk', chair: 'committee', sidd: 'sidd', scripts: 'scripts', record: 'record' };

  // ---------- the week, from the sample data ----------
  function et(ts) { return new Date(ts).toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: '2-digit' }).replace(',', '').replace(/ /g, '\u00a0') + '\u00a0ET'; }
  var W = {};
  if (SM && SM.rows) {
    var row = SM.rows.filter(function (r) { return r.week === SM.week.sunday; })[0];
    var byId = {}; SM.events.forEach(function (e) { byId[e.id] = e; });
    var inWeek = function (e) { return e.ts >= SM.week.start && e.ts <= SM.week.end; };
    if (row) {
      var ch = row.chain.map(function (id) { return byId[id]; });
      W.ticker = row.ticker; W.no = row.id.slice(2); W.dir = row.direction; W.months = row.months;
      W.drafted = et(ch[0].ts); W.reviewed = et(ch[2].ts); W.decided = et(ch[3].ts); W.signed = et(ch[4].ts); W.published = et(ch[5].ts);
    }
    var drop = SM.events.filter(function (e) { return e.type === 'chain.dropped' && inWeek(e) && e.stage === 'risk'; })[0];
    if (drop) W.vetoDay = new Date(drop.ts + 'T12:00:00Z').toLocaleString('en-US', { timeZone: 'UTC', weekday: 'short' });
    var closed = SM.events.filter(function (e) { return e.type === 'row.closed' && inWeek(e); })[0];
    if (closed) { var cr = SM.rows.filter(function (r) { return r.id === closed.ref; })[0]; W.closedNo = cr.id.slice(2); W.closedAs = cr.outcome; W.closedDay = new Date(closed.ts).toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'short' }); }
  }
  var call = W.ticker ? W.ticker + ' memo' : 'the memo';

  // ---------- what each seat says (wording from desk.html's stops) ----------
  var SEATS = {
    analyst: { kind: 'AI model', name: 'Analyst',
      cant: 'Publish, use tools, see a price, or write sizing, entry zones or price targets.',
      reads: 'Facts and quoted filing excerpts that a script prepared. Never a price.',
      week: W.drafted ? W.drafted + ': drafted the ' + call + '.' : 'Drafted one memo.' },
    risk: { kind: 'AI model', name: 'Risk officer',
      cant: 'Publish, approve anything, see a price or read the raw filings.',
      reads: 'The memo and numbers a script pulled from the filings. Not the filings themselves.',
      week: W.vetoDay ? W.vetoDay + ': vetoed one idea. ' + W.reviewed + ': passed ' + W.ticker + ' with a dissent.' : 'Vetoed one idea, passed one with a dissent.' },
    committee: { kind: 'AI model', name: 'Chair',
      cant: 'Publish, see a price, re-estimate the value range or push a call past a script check.',
      reads: 'The memo with its dissent, the script’s eligibility check and the calls already open.',
      week: W.decided ? W.decided + ': decided to publish ' + W.ticker + ', ' + W.dir + ', ' + W.months + ' months.' : 'Decided to publish one call.' },
    sidd: { kind: 'Person · signs', name: 'Sidd, portfolio manager',
      cant: 'I can’t change a call’s direction, raise its confidence, relax a check or size a position.',
      reads: 'I read the call and its reasoning exactly as they would publish.',
      week: W.signed ? W.signed + ': I signed No. ' + W.no + '.' : 'I signed one call.' },
    scripts: { kind: 'Script · no model', name: 'Scripts',
      cant: 'Publish a restricted, out-of-universe or already published ticker.',
      reads: 'Filings, macro series and end-of-day prices, after restricted names are dropped.',
      week: (W.closedNo ? W.closedDay + ': closed No. ' + W.closedNo + ' as a ' + W.closedAs + '. ' : '') + (W.published ? W.published + ': published No. ' + W.no + '.' : '') || 'Scored and published by rule.' },
    record: { kind: 'Script · no model', name: 'The record',
      cant: 'Edit a call after it is published. A changed mind lands as a new entry.',
      reads: 'Only the call I signed, as a script publishes it. No model touches it.',
      week: (W.no ? 'No. ' + W.no + ' went up' + (W.closedNo ? '; No. ' + W.closedNo + ' closed as a ' + W.closedAs + '. Both stay up.' : '.') : 'One call went up.') }
  };

  // ---------- the card ----------
  var card = document.createElement('div');
  card.className = 'seatcard'; card.id = 'seatcard'; card.hidden = true;
  card.setAttribute('role', 'dialog'); card.setAttribute('aria-labelledby', 'seatcard-t');
  card.innerHTML = '<button type="button" class="seatcard-x" aria-label="Close"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="2" fill="none"/></svg></button>' +
    '<p class="seatcard-k"></p><p class="seatcard-t" id="seatcard-t"></p><dl></dl>';
  stage.appendChild(card);
  var kEl = card.querySelector('.seatcard-k'), tEl = card.querySelector('.seatcard-t'), dl = card.querySelector('dl'), xBtn = card.querySelector('.seatcard-x');
  var btns = [].slice.call(tags.querySelectorAll('.tagbtn'));
  function btnOf(k) { return btns.filter(function (b) { return b.getAttribute('data-k') === k; })[0]; }
  var sheetMq = matchMedia('(hover: none), (pointer: coarse), (max-width: 640px)');
  var cur = null, pinned = false, opener = null, tIn = 0, tOut = 0;

  function fill(k) {
    var s = SEATS[k];
    kEl.textContent = s.kind; tEl.textContent = s.name;
    dl.innerHTML = '<dt>Can’t:</dt><dd></dd><dt>Reads:</dt><dd></dd><dt>This week:</dt><dd></dd>';
    var dd = dl.querySelectorAll('dd'); dd[0].textContent = s.cant; dd[1].textContent = s.reads; dd[2].textContent = s.week;
  }
  function place() {
    if (!cur) return;
    var sheet = sheetMq.matches; card.classList.toggle('sheet', sheet);
    card.style.left = card.style.top = card.style.bottom = '';
    if (sheet) {
      var now = document.querySelector('.now'), r = now && now.getBoundingClientRect(), vh = innerHeight, bottom = 8;
      if (r && r.top > 0 && r.bottom <= vh + 1 && r.top - 56 > card.offsetHeight + 16) bottom = Math.round(vh - r.top + 8); // above the caption, so the status line stays readable
      card.style.bottom = bottom + 'px'; return;
    }
    var st = stage.getBoundingClientRect(), W0 = st.width, H0 = st.height, cw = card.offsetWidth, chh = card.offsetHeight;
    var li = btnOf(cur) && btnOf(cur).parentNode, left, top;
    if (li && !li.hidden && !li.classList.contains('dim') && !li.inert) {
      var b = li.getBoundingClientRect();
      left = b.right - st.left + 10; top = b.top - st.top;
      if (left + cw > W0 - 8) left = b.left - st.left - 10 - cw;
    } else { left = W0 - cw - 24; top = 24; } // the tag is not on screen at this camera: a fixed spot at the top right
    card.style.left = Math.max(8, Math.min(left, W0 - cw - 8)) + 'px';
    card.style.top = Math.max(8, Math.min(top, H0 - chh - 8)) + 'px';
  }
  function setHash(on) {
    try {
      if (on) history.replaceState(null, '', '#seat=' + HASH[cur]);
      else if (RE.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
    } catch (e) {}
  }
  function open(k, pin, opts) {
    if (!SEATS[k]) return;
    clearTimeout(tIn); clearTimeout(tOut);
    if (cur !== k) fill(k);
    cur = k; pinned = !!pin; card.hidden = false;
    btns.forEach(function (b) { b.setAttribute('aria-expanded', String(b.getAttribute('data-k') === k)); });
    place();
    if (pin) setHash(true);
    if (window.HLR && HLR.pause) HLR.pause();
    if (pin && opts && opts.focus) xBtn.focus();
  }
  function close(back) {
    clearTimeout(tIn); clearTimeout(tOut);
    if (!cur) return;
    var k = cur; cur = null; pinned = false; card.hidden = true;
    btns.forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    setHash(false);
    var b = btnOf(k);
    if (back && b && !b.parentNode.hidden && !b.parentNode.inert) b.focus();
  }
  function later(k) { clearTimeout(tOut); tOut = setTimeout(function () { if (!pinned) close(false); }, 250); }

  btns.forEach(function (b) {
    var k = b.getAttribute('data-k');
    b.addEventListener('click', function (e) {
      if (!sheetMq.matches && cur === k && pinned) { close(false); return; }
      open(k, true, { focus: sheetMq.matches || e.detail === 0 }); // a sheet, or the keyboard: focus goes into the card
    });
    b.addEventListener('pointerenter', function (e) {
      if (sheetMq.matches || e.pointerType === 'touch' || pinned) return;
      clearTimeout(tOut); clearTimeout(tIn); tIn = setTimeout(function () { open(k, false); }, 120);
    });
    b.addEventListener('pointerleave', function () { clearTimeout(tIn); if (!pinned) later(); });
    b.addEventListener('focus', function () {
      if (sheetMq.matches || pinned || !b.matches(':focus-visible')) return;
      open(k, false);
    });
    b.addEventListener('blur', function () { if (!pinned) later(); });
  });
  card.addEventListener('pointerenter', function () { clearTimeout(tOut); });
  card.addEventListener('pointerleave', function () { if (!pinned) later(); });
  xBtn.addEventListener('click', function () { close(true); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && cur) { e.preventDefault(); close(true); }
  });
  document.addEventListener('pointerdown', function (e) {
    if (cur && !card.contains(e.target) && !(e.target.closest && e.target.closest('.tagbtn'))) close(false);
  });
  ['pp', 'nx'].forEach(function (id) { var n = document.getElementById(id); if (n) n.addEventListener('click', function () { close(false); }); }); // back to the replay: the card would be left behind a moving camera
  var rz; addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(place, 200); });

  function fromHash() {
    var m = RE.exec(location.hash);
    if (m) open(KEY[m[1]], true);
  }
  addEventListener('hashchange', fromHash);
  fromHash();
})();
