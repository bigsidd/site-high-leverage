/* The record page: scoreboard strip with heartbeat, numbered calls, and the closed detail (event log, paper book, confidence counts), all from sample.js.
   Every time on the page is New York time, marked ET. */
(function () {
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var PX = {
    fmtDate: function (iso, withTime) {
      if (withTime && iso.length > 10) return PX.et(iso);
      var d = iso.slice(0, 10).split('-');
      return MON[+d[1] - 1] + ' ' + (+d[2]);
    },
    et: function (iso) { return new Date(iso).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).replace(',', ' ·') + ' ET'; },
    money: function (n) { return (n < 0 ? '−' : n > 0 ? '+' : '') + '$' + Math.abs(n).toLocaleString('en-US'); }
  };
  var D = window.SAMPLE, $ = function (s) { return document.getElementById(s); };
  function el(t, cls, txt) { var e = document.createElement(t); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  var END = D.week.end;
  var key = function (e) { return e.ts.length === 10 ? e.ts + 'T12:00:00Z' : e.ts; };
  var EV = D.events.filter(function (e) { return key(e) <= END; });
  var ROWS = D.rows.filter(function (r) { return r.committed_at <= END; });
  var rowOf = function (id) { return ROWS.filter(function (r) { return r.id === id; })[0]; };
  var evOf = function (id) { return EV.filter(function (e) { return e.id === id; })[0]; };
  var no = function (r) { return 'No. ' + r.id.slice(2); };
  function etDate(ts) { // calendar date in New York for a UTC timestamp
    if (ts.length === 10) return ts;
    var t = new Date(ts), y = t.getUTCFullYear(), dstStart = Date.UTC(2026, 2, 8, 7), dstEnd = Date.UTC(2026, 10, 1, 6);
    var off = (y === 2026 && t >= dstStart && t < dstEnd) ? 4 : 5;
    return new Date(t - off * 3600000).toISOString().slice(0, 10);
  }
  var long = function (iso) { return PX.fmtDate(iso) + ', ' + iso.slice(0, 4); };
  var stepWhen = function (ts) { return DOW[new Date(etDate(ts) + 'T12:00:00Z').getUTCDay()] + ', ' + PX.et(ts); };
  var dayLong = function (iso) { return DOW[new Date(iso + 'T12:00:00Z').getUTCDay()] + ', ' + long(iso); };
  var plural = function (n, one, many) { return n + ' ' + (n === 1 ? one : many); };

  function trayCount() { return EV.filter(function (e) { return e.type === 'chain.dropped'; }).length; } // the No tray: the count of ideas stopped before publishing

  // scoreboard: counts, and per-confidence counts until 30 calls have closed (design/07)
  function scoreboard(on) {
    var rows = on ? ROWS : [], closed = rows.filter(function (r) { return r.outcome; });
    var wins = closed.filter(function (r) { return r.outcome === 'win'; }).length, losses = closed.length - wins;
    var sc = $('score'); sc.textContent = '';
    [[closed.length, 'closed of 100'], [wins, wins === 1 ? 'win' : 'wins'], [losses, losses === 1 ? 'loss' : 'losses'], [rows.length - closed.length, 'open'], [on ? trayCount() : 0, 'stopped before publishing']]
      .forEach(function (x, i) { var sp = el('span'); sp.appendChild(el('b', '', String(x[0]))); sp.appendChild(el('span', 'lbl', x[1])); sc.appendChild(sp); });
    $('meter').style.width = closed.length + '%';
    var tb = $('cal'); tb.textContent = '';
    ['high', 'standard'].forEach(function (b) {
      var rs = rows.filter(function (r) { return r.confidence_bucket === b; }), cs = rs.filter(function (r) { return r.outcome; });
      var tr = el('tr'), th = el('th', '', b[0].toUpperCase() + b.slice(1)); th.scope = 'row'; tr.appendChild(th);
      [rs.length, cs.length, cs.filter(function (r) { return r.outcome === 'win'; }).length, cs.filter(function (r) { return r.outcome === 'loss'; }).length]
        .forEach(function (n) { tr.appendChild(el('td', 'n', String(n))); });
      tb.appendChild(tr);
    });
    $('cal-note').textContent = 'Hit rate by confidence shows once 30 calls have closed (' + closed.length + ' so far). Until then, these are counts only.';
  }

  // calls: one line each, newest first; the dated steps fold underneath as the proof
  var STEP = {
    'memo.drafted': 'The analyst drafted the memo',
    'memo.forwarded': 'A script passed it to the risk officer',
    'risk.reviewed': 'The risk officer passed it, with a dissent attached',
    'decision.made': 'The chair decided to publish',
    'approval.stamped': 'I signed it, and the call carries this event id as its approval',
    'row.published': 'Published and sealed'
  };
  // the published reasoning for one call (design/07): the case, the case against it, and what would prove each wrong
  var tabSeq = 0;
  function reasoning(w) {
    var box = el('div', 'rs');
    box.appendChild(el('p', 'rs-tag', 'Written by hand to show the format. No model wrote this.'));
    var two = el('div', 'rs-two'), a = el('section', 'rs-case'), b = el('section', 'rs-dis');
    a.appendChild(el('h3', 'rs-h', 'The case'));
    a.appendChild(el('p', '', w.thesis));
    var wn = el('p'); wn.appendChild(el('span', 'rs-lab', 'Why now')); wn.appendChild(document.createTextNode(w.why_now)); a.appendChild(wn);
    b.appendChild(el('h3', 'rs-h', 'The risk officer\u2019s dissent'));
    b.appendChild(el('p', '', w.dissent.counter_case));
    var cf = el('p'); cf.appendChild(el('span', 'rs-lab', 'The dissent is right if')); cf.appendChild(document.createTextNode(w.dissent.counter_falsifier)); b.appendChild(cf);
    // phones: one column at a time (CSS hides the control and shows both columns from 640px up)
    var dl = el('p', 'rs-dline'); dl.appendChild(el('span', 'rs-lab', 'The dissent is right if: ')); dl.appendChild(document.createTextNode(w.dissent.counter_falsifier));
    var seg = el('div', 'rs-seg'), tabs = [];
    seg.setAttribute('role', 'tablist'); seg.setAttribute('aria-label', 'Show one column');
    var uid = 't' + (++tabSeq);
    [['case', 'The case', a], ['dis', 'The risk officer\u2019s dissent', b]].forEach(function (t, i) {
      var bt = el('button', '', t[1]); bt.type = 'button'; bt.id = uid + t[0];
      bt.setAttribute('role', 'tab'); bt.setAttribute('aria-controls', uid + 'p' + t[0]);
      t[2].id = uid + 'p' + t[0]; t[2].setAttribute('role', 'tabpanel'); t[2].setAttribute('aria-labelledby', bt.id);
      tabs.push(bt); seg.appendChild(bt);
    });
    function pick(i, focus) {
      box.dataset.tab = i ? 'dis' : 'case';
      tabs.forEach(function (t, j) { t.setAttribute('aria-selected', String(j === i)); t.tabIndex = j === i ? 0 : -1; });
      if (focus) tabs[i].focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { pick(i); });
      t.addEventListener('keydown', function (e) {
        var n = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: 0, ArrowUp: 0, Home: 0, End: 1 }[e.key];
        if (n == null) return; e.preventDefault(); pick(n, true);
      });
    });
    pick(0);
    box.appendChild(dl); box.appendChild(seg);
    two.appendChild(a); two.appendChild(b); box.appendChild(two);
    var brk = el('details', 'rs-brk'); brk.appendChild(el('summary', '', 'What would break it'));
    var tw = el('div', 'tw'), tb = el('table', 'rs-p'), hd = el('tr');
    ['Pillar', 'Must stay true', 'Breaks if', 'Proved wrong by'].forEach(function (h) { var th = el('th', '', h); th.setAttribute('scope', 'col'); hd.appendChild(th); });
    var th0 = el('thead'); th0.appendChild(hd); tb.appendChild(th0);
    var bd = el('tbody');
    w.pillars.forEach(function (p) {
      var tr = el('tr'), f = w.falsifiers.filter(function (x) { return x.pillar_id === p.id; }).map(function (x) { return x.falsifier; }).join(' ');
      [p.id, p.must_remain_true, p.would_break_if, f].forEach(function (t, i) { tr.appendChild(el(i ? 'td' : 'th', '', t)); });
      tr.firstChild.setAttribute('scope', 'row'); bd.appendChild(tr);
    });
    tb.appendChild(bd); tw.appendChild(tb); brk.appendChild(tw);
    brk.appendChild(el('p', 'muted', 'On the real ledger this text is ledger/reasoning/C-n.json, published in the same commit as the row. Its public_sha256 lets you recompute, from the ledger alone, that this is the text Sidd signed.'));
    box.appendChild(brk);
    return box;
  }
  function openFromHash() { // record.html#C-6 opens that call
    var id = location.hash.slice(1);
    if (id === 'feed') { var fd = document.getElementById('feed'); if (fd) { fd.open = true; fd.scrollIntoView({ block: 'start' }); } return; }
    if (!/^C-\d+$/.test(id)) return;
    var li = document.getElementById(id); if (!li) return;
    var d = li.querySelector('details'); if (d) d.open = true;
    li.scrollIntoView({ block: 'start' });
  }
  addEventListener('hashchange', openFromHash);
  function calls(on) {
    var box = $('calllist'); box.textContent = '';
    if (on) ROWS.slice().reverse().forEach(function (r) {
      var li = el('li', 'call'), det = el('details'), sum = el('summary'), line = el('span', 'cl');
      li.id = r.id;
      line.appendChild(el('b', 'cn', no(r)));
      line.appendChild(document.createTextNode(' · ' + r.ticker + ' · ' + r.direction + ' · ' + r.confidence_bucket + ' · ' + (r.outcome ? 'closed ' : 'closes ') + long(r.horizon_end)));
      sum.appendChild(line);
      sum.appendChild(el('span', 'st ' + (r.outcome ? 's-' + r.outcome : 's-open'), r.outcome ? (r.outcome === 'win' ? 'Win' : 'Loss') : 'Open'));
      det.appendChild(sum);
      if (r === ROWS[ROWS.length - 1]) det.open = true; // the newest call opens by default
      var why = (D.reasoning || {})[r.id];
      if (why) det.appendChild(reasoning(why));
      det.appendChild(el('p', 'rs-lab rs-how', 'How it got here'));
      var ol = el('ol', 'steps'), ids = [];
      r.chain.forEach(function (id) {
        var e = evOf(id), s = el('li'), t = el('time', '', stepWhen(e.ts)), p = el('p');
        t.setAttribute('datetime', e.ts);
        p.textContent = STEP[e.type] + (e.type === 'row.published' ? ' (commit ' + r.sha + ', placeholder)' : '') + '.';
        ids.push(e.type + ' · ' + e.id);
        s.appendChild(t); s.appendChild(p); ol.appendChild(s);
      });
      var last = el('li', r.outcome ? '' : 'later'), lt = el('time'), lp = el('p');
      if (r.outcome) { lt.textContent = stepWhen(r.closed_at); lt.setAttribute('datetime', r.closed_at); lp.textContent = 'Closed at its ' + r.months + '-month horizon: a ' + r.outcome + ' against both benchmarks.'; }
      else { lt.textContent = long(r.horizon_end); lp.textContent = 'Closes at that day’s close, ' + r.months + ' months after publishing; the result isn’t known yet.'; }
      last.appendChild(lt); last.appendChild(lp); ol.appendChild(last);
      det.appendChild(ol);
      var pr = el('details', 'rs-brk'); pr.appendChild(el('summary', '', 'Event ids and proof'));
      pr.appendChild(el('p', 'mono', ids.join(' → ')));
      pr.appendChild(el('p', 'muted', 'On the real ledger each step links to its commit and timestamp proof. In this preview there is nothing to verify.'));
      det.appendChild(pr);
      li.appendChild(det); box.appendChild(li);
    });
    else box.appendChild(el('li', 'call none', 'No calls yet. No. 1 appears only after the chair decides and I sign.'));
    // day 0: the rules are sealed before the first call (design/16)
    var d0 = el('li', 'call day0'), dl = el('p', 'cl');
    dl.appendChild(el('b', 'cn', 'Day 0'));
    dl.appendChild(document.createTextNode(on ? ' · ' + long(D.cutover) : ' · not dated yet'));
    d0.appendChild(dl);
    if (on) dl.appendChild(el('span', 'st s-open', 'Rules sealed'));
    d0.appendChild(el('p', 'muted', on
      ? 'The prompts, the tests, the scoring rule and the 100-call rule were committed and anchored before No. 1. Any change adds a new dated entry.'
      : 'The prompts, the tests, the scoring rule and the 100-call rule get committed before No. 1. Any later change adds a new dated entry.'));
    box.appendChild(d0);
  }

  // heartbeat: one dot per night since day 0, gaps for missed nights (design/16)
  function heartbeat(on) {
    var box = $('beat'); box.textContent = ''; box.style.gridTemplateColumns = '';
    if (!on) {
      $('beat-note').textContent = 'No nights yet. The first dot appears the night after day 0.'; return;
    }
    var ran = {}, days = [];
    EV.forEach(function (e) { if (e.type === 'day.ran') ran[etDate(e.ts)] = 1; });
    for (var d = D.cutover; d <= D.week.sunday; d = D.add(d, 1)) days.push(d);
    var missed = days.filter(function (x) { return !ran[x]; });
    days.forEach(function (x) { var i = el('i', ran[x] ? '' : 'gap'); i.title = PX.fmtDate(x) + (ran[x] ? ': ran' : ': missed'); box.appendChild(i); });
    var txt = 'In this sample, the desk ran ' + (days.length - missed.length) + ' of ' + days.length + ' nights since ' + long(days[0]) + '.' + (missed.length ? ' It missed ' + missed.map(function (x) { return PX.fmtDate(x); }).join(' and ') + '.' : ' It missed none.');
    box.style.gridTemplateColumns = 'repeat(' + days.length + ',1fr)';
    $('beat-note').textContent = txt + ' Once it runs, each filled dot is one nightly run, and missed nights stay visible as outlined gaps.';
  }

  // the full event log
  var ROUTINE = { 'digest.sent': 1, 'week.quiet': 1, 'row.scored': 1, 'anomaly.flagged': 1, 'thesis.checked': 1, 'day.ran': 1 };
  var FOLD = { 'anomaly.flagged': 1, 'row.scored': 1, 'thesis.checked': 1, 'day.ran': 1 };
  var STAGE = { note: 'the note', risk: 'the risk officer', committee: 'the chair', sidd: 'my desk' };
  function text(e, n) {
    var r = e.ref && rowOf(e.ref);
    switch (e.type) {
      case 'day.ran': return 'The desk ran ' + plural(n, 'night', 'nights') + ', logged by date and status only.';
      case 'anomaly.flagged': return plural(n, 'anomaly', 'anomalies') + ' flagged by threshold, logged as a count only.';
      case 'row.scored': return 'The scorer ran ' + plural(n, 'night', 'nights') + '; it recomputes scores and never changes a call.';
      case 'thesis.checked': return plural(n, 'open call', 'open calls') + ' re-checked against the memo, logged as a count only.';
      case 'note.drafted': return 'The analyst wrote a note on a flag, with no ticker.';
      case 'note.decided': return 'I read the week’s notes.';
      case 'memo.drafted': return 'The analyst drafted a memo from a script screen.';
      case 'memo.forwarded': return 'A script passed the memo to the risk officer.';
      case 'risk.reviewed': return 'The risk officer passed the memo with a dissent attached.';
      case 'decision.made': var dr = rowOf(e._row); return 'The chair decided to publish: ' + dr.months + ' months, ' + dr.confidence_bucket + ' confidence.';
      case 'approval.stamped': return 'I signed ' + no(r) + '.';
      case 'row.published': return no(r) + ' · ' + r.ticker + ', ' + r.direction + ', ' + r.months + ' months, ' + r.confidence_bucket + ' confidence.';
      case 'chain.dropped': return 'A memo stopped at ' + (STAGE[e.stage] || e.stage) + ', recorded with its stage and date and no ticker.';
      case 'row.closed': return no(r) + ' · ' + r.ticker + ' closed at its horizon as a ' + (r.outcome === 'win' ? 'win.' : 'loss.');
      case 'digest.sent': return 'The weekly digest went out, with the week’s events in one batch.';
      case 'week.quiet': return 'A quiet week: nothing reached the chair.';
    }
    return '';
  }
  function tag(e) {
    var r = e.ref && rowOf(e.ref);
    if (e.type === 'row.published') return ['Call', 't-call'];
    if (e.type === 'approval.stamped') return ['Signed', 't-stamp'];
    if (e.type === 'chain.dropped') return ['No', 't-drop'];
    if (e.type === 'row.closed') return r.outcome === 'win' ? ['Win', 't-win'] : ['Loss', 't-loss'];
    return null;
  }
  function timeline() {
    var box = $('weeks'); box.textContent = '';
    ROWS.forEach(function (r) { EV.forEach(function (e) { if (r.chain.indexOf(e.id) >= 0) Object.defineProperty(e, '_row', { value: r.id, configurable: true }); }); });
    var weeks = {};
    EV.forEach(function (e) {
      var d = etDate(e.ts), dow = new Date(d + 'T12:00:00Z').getUTCDay(), sun = D.add(d, (7 - dow) % 7);
      (weeks[sun] = weeks[sun] || []).push(e);
    });
    Object.keys(weeks).sort().reverse().forEach(function (sun) {
      var li = el('li', 'wk' + (sun === D.week.sunday ? '' : ' earlier')), h = el('h3', '', 'Week ending ' + dayLong(sun)), ol = el('ol', 'rail');
      var list = weeks[sun].slice().reverse(), seen = {};
      list.forEach(function (e) {
        if (FOLD[e.type] && seen[e.type]) { seen[e.type].n++; seen[e.type].first = e; return; }
        var item = { e: e, n: 1, first: e }; if (FOLD[e.type]) seen[e.type] = item;
        item.li = el('li', ROUTINE[e.type] ? 'routine' : ''); ol.appendChild(item.li);
        item.render = function () {
          var x = item.e, t = el('time'), body = el('div'), tg = tag(x), p = el('p', tg && tg[1] !== 't-drop' ? 'big' : '');
          t.setAttribute('datetime', x.ts);
          t.textContent = item.n > 1 ? PX.fmtDate(etDate(item.first.ts)) + (etDate(item.first.ts) === etDate(x.ts) ? '' : '–' + PX.fmtDate(etDate(x.ts))) : PX.fmtDate(x.ts, true) + (x.ts.length === 10 ? ' · date only' : '');
          if (tg) p.appendChild(el('span', 'tag ' + tg[1], tg[0]));
          p.appendChild(el('code', '', x.type + (item.n > 1 ? ' ×' + item.n : '')));
          p.appendChild(document.createTextNode(text(x, item.n)));
          body.appendChild(p);
          body.appendChild(el('p', 'who', x.actor + (x.role && x.role !== x.actor ? ' as ' + x.role : '') + (x.stage ? ' · stage ' + x.stage : '') + ' · ' + (item.n > 1 ? item.n + ' events' : x.id) + ' · ' + x.sha));
          item.li.appendChild(t); item.li.appendChild(body);
        };
        item.li._item = item;
      });
      [].forEach.call(ol.children, function (c) { c._item.render(); });
      li.appendChild(h); li.appendChild(ol); box.appendChild(li);
    });
    view();
  }

  // The sample week is the default view; earlier weeks and routine rows are opt-in.
  var showEarlier = false, showRoutine = false;
  function view() {
    var weeks = document.querySelectorAll('#weeks .wk'), older = 0;
    [].forEach.call(weeks, function (w) {
      var isOld = w.classList.contains('earlier'), rows = w.querySelectorAll('.rail > li'), vis = 0;
      if (isOld) older++;
      [].forEach.call(rows, function (r) { var h = r.classList.contains('routine') && !showRoutine; r.hidden = h; if (!h) vis++; });
      w.hidden = (isOld && !showEarlier) || vis === 0;
    });
    var be = $('b-earlier'), br = $('b-routine');
    be.setAttribute('aria-expanded', String(showEarlier));
    be.textContent = showEarlier ? 'Hide ' + older + ' earlier weeks' : 'Show ' + older + ' earlier weeks';
    br.setAttribute('aria-pressed', String(showRoutine));
    $('tl-note').textContent = (showEarlier ? 'Showing all ' + (older + 1) + ' weeks' : 'Showing the sample week, ' + PX.fmtDate(etDate(D.week.start)) + '–' + (+D.week.sunday.slice(8)) + ', ' + D.week.sunday.slice(0, 4)) + (showRoutine ? ', with routine events.' : ', without routine events (nightly runs, digest, scorer, counts).');
  }
  $('b-earlier').addEventListener('click', function () { showEarlier = !showEarlier; view(); });
  $('b-routine').addEventListener('click', function () { showRoutine = !showRoutine; view(); });

  function book() {
    var tb = $('bk'), pc = function (n) { return (n < 0 ? '\u2212' : '+') + Math.abs(n).toFixed(1) + '%'; }; tb.textContent = '';
    var closed = ROWS.filter(function (r) { return r.outcome; }), wins = closed.filter(function (r) { return r.outcome === 'win'; }).length;
    ROWS.slice().reverse().forEach(function (r) {
      var tr = el('tr'), th = el('th', 'mono', no(r)); th.scope = 'row'; tr.appendChild(th);
      tr.appendChild(el('td', '', r.direction === 'outperform' ? r.ticker + ' against SPY' : 'SPY against ' + r.ticker));
      tr.appendChild(el('td', 'n', '$10,000'));
      tr.appendChild(el('td', 'n', r.excess ? pc(r.excess.spy) : 'not yet'));
      tr.appendChild(el('td', 'n', r.excess ? pc(r.excess.sector) : 'not yet'));
      tr.appendChild(el('td', 'res', r.outcome ? 'Closed \u00b7 ' + r.outcome : r.pending ? 'Enters at the next close' : 'Open, not marked'));
      tb.appendChild(tr);
    });
    $('bk-total').textContent = closed.length + ' of ' + ROWS.length + ' calls closed (' + wins + ' ' + (wins === 1 ? 'win' : 'wins') + ', ' + (closed.length - wins) + ' ' + (closed.length - wins === 1 ? 'loss' : 'losses') + ').';
    var m = D.mirror;
    $('mirror').textContent = 'Broker paper mirror: ' + m.closedByScript + ' of ' + m.due + ' signed outperform calls placed and closed by script, ' + m.manualFixes + ' manual fixes. ' + (m.signed - m.due) + ' more ' + (m.signed - m.due === 1 ? 'is' : 'are') + ' open; ' + m.notMirrored + ' underperform calls not placed. These are sample values.';
  }

  function feed() {
    $('jsonl').textContent = EV.filter(function (e) { return key(e) >= D.week.start; }).map(function (e) { return JSON.stringify(e); }).join('\n');
  }

  var built = false;
  function apply(s) {
    var on = s === 'sample';
    document.documentElement.dataset.state = s;
    [].forEach.call(document.querySelectorAll('[data-set]'), function (b) { b.setAttribute('aria-pressed', String(b.dataset.set === s)); });
    scoreboard(on); calls(on); heartbeat(on);
    if (on && !built) { timeline(); book(); feed(); built = true; }
  }
  [].forEach.call(document.querySelectorAll('[data-set]'), function (b) { b.addEventListener('click', function () { apply(b.dataset.set); }); });
  apply('sample');
  openFromHash();
})();
