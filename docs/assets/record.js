/* The record page: scoreboard, numbered calls, heartbeat, event log, paper book and raw feed, all from sample.js.
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
  var stepWhen = function (ts) { return DOW[new Date(etDate(ts) + 'T12:00:00Z').getUTCDay()] + ' ' + PX.et(ts); };

  // scoreboard: counts, and per-confidence counts until 30 calls have closed (design/07)
  function scoreboard(on) {
    var rows = on ? ROWS : [], closed = rows.filter(function (r) { return r.outcome; });
    $('n-closed').textContent = closed.length;
    $('n-month').textContent = 'Month ' + (on ? D.monthsElapsed : 0) + ' of 6.';
    $('meter').style.width = closed.length + '%';
    $('n-win').textContent = closed.filter(function (r) { return r.outcome === 'win'; }).length;
    $('n-loss').textContent = closed.filter(function (r) { return r.outcome === 'loss'; }).length;
    $('n-open').textContent = rows.length - closed.length;
    $('n-tray').textContent = on ? EV.filter(function (e) { return e.type === 'chain.dropped'; }).length : 0;
    var tb = $('cal'); tb.textContent = '';
    ['high', 'medium', 'low'].forEach(function (b) {
      var rs = rows.filter(function (r) { return r.confidence_bucket === b; }), cs = rs.filter(function (r) { return r.outcome; });
      var tr = el('tr'), th = el('th', '', b[0].toUpperCase() + b.slice(1)); th.scope = 'row'; tr.appendChild(th);
      [rs.length, cs.length, cs.filter(function (r) { return r.outcome === 'win'; }).length, cs.filter(function (r) { return r.outcome === 'loss'; }).length]
        .forEach(function (n) { tr.appendChild(el('td', 'n', String(n))); });
      tb.appendChild(tr);
    });
    $('cal-note').textContent = 'Hit rate by confidence shows once 30 calls have closed (' + closed.length + ' so far). Until then, counts only.';
  }

  // calls: one line each, newest first; the dated steps fold underneath as the proof
  var STEP = {
    'memo.drafted': 'The analyst drafted the memo',
    'memo.forwarded': 'A script passed it to the risk officer',
    'risk.reviewed': 'The risk officer passed it, with a dissent attached',
    'decision.made': 'The committee chair voted to publish',
    'approval.stamped': 'Sidd signed it. The call carries this event id as its approval',
    'row.published': 'Published and sealed'
  };
  function calls(on) {
    var box = $('calllist'); box.textContent = '';
    if (on) ROWS.slice().reverse().forEach(function (r) {
      var li = el('li', 'call'), det = el('details'), sum = el('summary'), line = el('span', 'cl');
      line.appendChild(el('b', 'cn', no(r)));
      line.appendChild(document.createTextNode(' · ' + r.ticker + ' · ' + r.direction + ' · ' + r.confidence_bucket + ' · ' + (r.outcome ? 'closed ' : 'closes ') + long(r.horizon_end)));
      sum.appendChild(line);
      sum.appendChild(el('span', 'st ' + (r.outcome ? 's-' + r.outcome : 's-open'), r.outcome ? (r.outcome === 'win' ? 'Win' : 'Loss') : 'Open'));
      det.appendChild(sum);
      var ol = el('ol', 'steps');
      r.chain.forEach(function (id) {
        var e = evOf(id), s = el('li'), t = el('time', '', stepWhen(e.ts)), p = el('p');
        t.setAttribute('datetime', e.ts);
        p.textContent = STEP[e.type] + (e.type === 'row.published' ? ' (commit ' + r.sha + ', placeholder)' : '') + '.';
        p.appendChild(el('span', 'eid', ' ' + e.type + ' · ' + e.id));
        s.appendChild(t); s.appendChild(p); ol.appendChild(s);
      });
      var last = el('li', r.outcome ? '' : 'later'), lt = el('time'), lp = el('p');
      if (r.outcome) { lt.textContent = stepWhen(r.closed_at); lt.setAttribute('datetime', r.closed_at); lp.textContent = 'Closed at its ' + r.months + '-month horizon: a ' + r.outcome + ' against both benchmarks.'; }
      else { lt.textContent = long(r.horizon_end); lp.textContent = 'Closes at that day’s close, ' + r.months + ' months after publishing. Not known yet.'; }
      last.appendChild(lt); last.appendChild(lp); ol.appendChild(last);
      det.appendChild(ol);
      det.appendChild(el('p', 'xs muted', 'On the real ledger each step links to its commit and timestamp proof. In this preview there is nothing to verify.'));
      li.appendChild(det); box.appendChild(li);
    });
    else box.appendChild(el('li', 'call none', 'No calls yet. No. 1 appears only after the committee chair decides and Sidd signs. The model never publishes.'));
    // day 0: the rules are sealed before the first call (design/16)
    var d0 = el('li', 'call day0'), dl = el('p', 'cl');
    dl.appendChild(el('b', 'cn', 'Day 0'));
    dl.appendChild(document.createTextNode(on ? ' · ' + long(D.cutover) + ' · rules sealed' : ' · not dated yet · rules seal here'));
    d0.appendChild(dl);
    d0.appendChild(el('p', 'small muted', on
      ? 'The prompts, the test suite, the scoring rule and the 100-call rule were committed and anchored before No. 1. Changing any of them adds a new dated entry. Nothing here is rewritten.'
      : 'The prompts, the test suite, the scoring rule and the 100-call rule get committed and anchored before No. 1. Any later change adds a new dated entry.'));
    box.appendChild(d0);
  }

  // heartbeat: one dot per night since day 0, gaps for missed nights (design/16)
  function heartbeat(on) {
    var box = $('beat'); box.textContent = '';
    if (!on) {
      box.setAttribute('aria-label', 'No nights yet.'); $('t0').textContent = 'Day 0'; $('t1').textContent = 'Today';
      $('beat-note').textContent = 'The first dot appears the night after cutover.'; return;
    }
    var ran = {}, days = [];
    EV.forEach(function (e) { if (e.type === 'day.ran') ran[etDate(e.ts)] = 1; });
    for (var d = D.cutover; d <= D.week.sunday; d = D.add(d, 1)) days.push(d);
    var missed = days.filter(function (x) { return !ran[x]; });
    days.forEach(function (x) { var i = el('i', ran[x] ? '' : 'gap'); i.title = PX.fmtDate(x) + (ran[x] ? ': ran' : ': missed'); box.appendChild(i); });
    $('t0').textContent = 'Day 0 · ' + PX.fmtDate(days[0]); $('t1').textContent = PX.fmtDate(days[days.length - 1]);
    var txt = (days.length - missed.length) + ' of ' + days.length + ' nights since ' + long(days[0]) + '. Missed: ' + (missed.length ? missed.map(function (x) { return PX.fmtDate(x); }).join(' and ') : 'none') + '.';
    box.setAttribute('aria-label', txt);
    $('beat-note').textContent = txt + ' Each night is one dated event with no tickers in it.';
  }

  // the full event log
  var ROUTINE = { 'digest.sent': 1, 'week.quiet': 1, 'row.scored': 1, 'anomaly.flagged': 1, 'thesis.checked': 1, 'day.ran': 1 };
  var FOLD = { 'anomaly.flagged': 1, 'row.scored': 1, 'thesis.checked': 1, 'day.ran': 1 };
  var STAGE = { note: 'the note', risk: 'the risk officer', committee: 'the committee chair', sidd: 'Sidd' };
  function text(e, n) {
    var r = e.ref && rowOf(e.ref);
    switch (e.type) {
      case 'day.ran': return 'The desk ran ' + n + (n > 1 ? ' nights' : ' night') + '. Date and status only.';
      case 'anomaly.flagged': return n + (n > 1 ? ' anomalies' : ' anomaly') + ' flagged by threshold. Count only.';
      case 'row.scored': return 'Scorer ran ' + n + (n > 1 ? ' nights' : ' night') + '. Scores are recomputed; calls never change.';
      case 'thesis.checked': return n + ' open ' + (n > 1 ? 'calls' : 'call') + ' re-checked against the memo. Count only.';
      case 'note.drafted': return 'The analyst wrote a note on a flag. No ticker.';
      case 'note.decided': return 'Sidd read the week’s notes.';
      case 'memo.drafted': return 'The analyst drafted a memo from a script screen.';
      case 'memo.forwarded': return 'A script passed the memo to the risk officer.';
      case 'risk.reviewed': return 'Passed, with a dissent attached.';
      case 'decision.made': var dr = rowOf(e._row); return 'The committee chair voted to publish: ' + dr.months + ' months, ' + dr.confidence_bucket + ' confidence.';
      case 'approval.stamped': return 'Sidd signed ' + no(r) + '.';
      case 'row.published': return no(r) + ' · ' + r.ticker + ', ' + r.direction + ', ' + r.months + ' months, ' + r.confidence_bucket + ' confidence.';
      case 'chain.dropped': return 'A memo stopped at ' + (STAGE[e.stage] || e.stage) + '. Stage and date only, no ticker.';
      case 'row.closed': return no(r) + ' · ' + r.ticker + ' closed at its horizon. ' + (r.outcome === 'win' ? 'Win.' : 'Loss.');
      case 'digest.sent': return 'Weekly digest sent. The week’s events went out in one batch.';
      case 'week.quiet': return 'Quiet week. Nothing reached the chair.';
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
      var li = el('li', 'wk' + (sun === D.week.sunday ? '' : ' earlier')), h = el('h3', '', 'Week ending Sunday ' + long(sun)), ol = el('ol', 'rail');
      var list = weeks[sun].slice().reverse(), seen = {};
      list.forEach(function (e) {
        if (FOLD[e.type] && seen[e.type]) { seen[e.type].n++; seen[e.type].first = e; return; }
        var item = { e: e, n: 1, first: e }; if (FOLD[e.type]) seen[e.type] = item;
        item.li = el('li', ROUTINE[e.type] ? 'routine' : ''); ol.appendChild(item.li);
        item.render = function () {
          var x = item.e, t = el('time'), body = el('div'), tg = tag(x), p = el('p', tg && tg[1] !== 't-drop' ? 'big' : '');
          t.setAttribute('datetime', x.ts);
          t.textContent = item.n > 1 ? PX.fmtDate(item.first.ts) + ' to ' + PX.fmtDate(x.ts) : PX.fmtDate(x.ts, true) + (x.ts.length === 10 ? ' · date only' : '');
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
    $('tl-note').textContent = (showEarlier ? 'Showing all ' + (older + 1) + ' weeks' : 'Showing the sample week, ' + PX.fmtDate(D.week.start) + ' to ' + PX.fmtDate(D.week.sunday)) + (showRoutine ? ', with routine events.' : ', without routine events (nightly runs, digest, scorer, counts).');
  }
  $('b-earlier').addEventListener('click', function () { showEarlier = !showEarlier; view(); });
  $('b-routine').addEventListener('click', function () { showRoutine = !showRoutine; view(); });

  function book() {
    var tb = $('bk'), total = D.book.start; tb.textContent = '';
    ROWS.slice().reverse().forEach(function (r) {
      var tr = el('tr'), th = el('th', 'mono', no(r)); th.scope = 'row'; tr.appendChild(th);
      tr.appendChild(el('td', '', r.direction === 'outperform' ? r.ticker + ' against SPY' : 'SPY against ' + r.ticker));
      tr.appendChild(el('td', 'n', '$10,000'));
      tr.appendChild(el('td', 'n', r.book == null ? 'not yet' : PX.money(r.book)));
      tr.appendChild(el('td', 'res', r.book == null ? 'Enters at the next close' : r.outcome ? 'Closed · ' + r.outcome : 'Open, marked'));
      if (r.book != null) total += r.book;
      tb.appendChild(tr);
    });
    $('bk-total').textContent = '$' + total.toLocaleString('en-US');
    var f = D.fills;
    $('fills').textContent = 'Broker paper fills: ' + f.mirrored + ' calls copied, ' + f.queued + ' waiting for the next open, ' + f.notMirrored + ' underperform calls not copied. Paper P&L ' + PX.money(f.pl) + '. The same dollars in SPY over the same dates: ' + PX.money(f.spy) + '. Sample.';
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
    if (window.HLRVignette) window.HLRVignette(on ? { vetoes: 3 } : { vetoes: 0, empty: true }); // the real wall is empty too
    if (on && !built) { timeline(); book(); feed(); built = true; }
  }
  [].forEach.call(document.querySelectorAll('[data-set]'), function (b) { b.addEventListener('click', function () { apply(b.dataset.set); }); });
  apply('sample');
})();
