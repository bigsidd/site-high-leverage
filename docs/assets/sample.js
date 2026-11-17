/* Labeled sample data for the design preview. Not a ledger, never read from one.
   Every ticker (XMPL, PLHD, MOCK, FAUX, DUMY, SMPL) is an invented placeholder, one per call, so no company ever has two open calls (the desk allows one per company). Event shape and types follow design/07 events.v1:
   {v, id, ts, type, actor, role, sha, stage?, ref?}. role is null for actions no roster role owns (stamp, publish, scorer, digest).
   chain.dropped carries a date only, role null, and stage = where the chain stopped. */
(function () {
  var DST_START = Date.UTC(2026, 2, 8), DST_END = Date.UTC(2026, 10, 1); // US DST 2026
  function utc(d, hh, mm) { // ET wall clock to ISO UTC
    var p = d.split('-').map(Number), t = Date.UTC(p[0], p[1] - 1, p[2]);
    var off = t >= DST_START && t < DST_END ? 4 : 5;
    return new Date(t + ((hh + off) * 60 + mm) * 60000).toISOString().replace('.000', '');
  }
  function add(d, n) { var t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); }

  // Up to two committee decisions a week (one or two is the forecast); one Sidd stamp per published call, on Sunday.
  // Two confidence levels, standard and high, either direction; high on at most a quarter of calls. 3-month horizon by default.
  var ROWS = [
    { id: 'C-1', ticker: 'XMPL', direction: 'outperform', months: 3, horizon_end: '2026-10-05', confidence_bucket: 'standard', week: '2026-07-05', outcome: 'win', excess: { spy: 6.4, sector: 4.9 } },
    { id: 'C-2', ticker: 'PLHD', direction: 'underperform', months: 3, horizon_end: '2026-10-19', confidence_bucket: 'standard', week: '2026-07-19', outcome: 'loss', excess: { spy: 4.1, sector: 2.6 } },
    { id: 'C-3', ticker: 'MOCK', direction: 'outperform', months: 3, horizon_end: '2026-11-02', confidence_bucket: 'standard', week: '2026-08-02', outcome: 'loss', excess: { spy: -8.8, sector: -7.2 } },
    { id: 'C-4', ticker: 'FAUX', direction: 'outperform', months: 6, horizon_end: '2027-02-23', confidence_bucket: 'standard', week: '2026-08-23', outcome: null, excess: null },
    { id: 'C-5', ticker: 'DUMY', direction: 'underperform', months: 3, horizon_end: '2026-12-28', confidence_bucket: 'high', week: '2026-09-27', outcome: null, excess: null },
    { id: 'C-6', ticker: 'SMPL', direction: 'underperform', months: 3, horizon_end: '2027-02-08', confidence_bucket: 'standard', week: '2026-11-08', outcome: null, excess: null, pending: true }
  ];
  // Week plan keyed by Sunday. drop = [stage, date the chain stopped].
  var PLAN = {
    '2026-07-12': ['risk', '2026-07-11'], '2026-08-09': ['committee', '2026-08-08'],
    '2026-08-30': ['risk', '2026-08-29'], '2026-09-13': ['risk', '2026-09-12'],
    '2026-10-04': ['committee', '2026-10-03'], '2026-10-18': ['risk', '2026-10-17'],
    '2026-11-08': ['risk', '2026-11-05']
  };
  var FIRST = '2026-07-05', LAST = '2026-11-08';
  var CUTOVER = '2026-07-04', MISSED = ['2026-08-17', '2026-10-06']; // day 0, and two nights the desk didn't run (shown as gaps)

  var ev = [], seq = 0;
  function push(ts, type, actor, role, rel, ref, stage) {
    var e = { v: 1, id: '', ts: ts, type: type, actor: actor, role: role, sha: '' };
    if (stage) e.stage = stage;
    if (ref) e.ref = ref;
    Object.defineProperty(e, '_k', { value: [ts.length === 10 ? ts + 'T12:00:00Z' : ts, seq++, rel] });
    ev.push(e); return e;
  }
  var wi = 0;
  for (var S = FIRST; S <= LAST; S = add(S, 7), wi++) {
    var batch = 'sun:' + S, noted = false;
    for (var di = 0; di < 7; di++) {
      var d = add(S, di - 6), dow = di; // 0 Mon … 6 Sun
      if (d.slice(8) === '01') { // monthly thesis check, count only
        ROWS.forEach(function (r) { if (r.week < d && r.horizon_end >= d) push(utc(d, 10, 0), 'thesis.checked', 'research-analyst', 'thesis-tracker', batch); });
      }
      if (d >= CUTOVER && MISSED.indexOf(d) < 0) push(utc(d, 23, 30), 'day.ran', 'script', null, 'score:' + d); // design/16 heartbeat: date and status only
      if (dow > 4) continue;
      var n = [2, 0, 1, 0, 1][(di + wi) % 5];
      for (var k = 0; k < n; k++) push(utc(d, 17, 30), 'anomaly.flagged', 'script', 'market-sentinel', batch);
      if (n && !noted) { noted = true; push(utc(d, 17, 41), 'note.drafted', 'research-analyst', 'market-sentinel', batch); }
      var night = 'score:' + d, any = false;
      ROWS.forEach(function (r) {
        if (r.week < d) any = true;
        if (r.horizon_end === d) { r.closed_at = utc(d, 22, 0); push(r.closed_at, 'row.closed', 'script', null, night, r.id); }
      });
      if (any) push(utc(d, 22, 0), 'row.scored', 'script', null, night);
    }
    var sat = add(S, -1), row = ROWS.filter(function (r) { return r.week === S; })[0], drop = PLAN[S];
    if (drop) push(drop[1], 'chain.dropped', 'script', null, batch, null, drop[0]);
    push(utc(S, 18, 0), 'digest.sent', 'script', null, batch);
    if (!row && !drop) push(utc(S, 18, 0), 'week.quiet', 'script', null, batch);
    if (noted) push(utc(S, 18, 8), 'note.decided', 'sidd', null, batch);
    if (row) {
      var rel = 'pub:' + row.id;
      row.chain = [
        push(utc(sat, 10, 4), 'memo.drafted', 'research-analyst', 'value-scout', rel),
        push(utc(sat, 10, 5), 'memo.forwarded', 'script', 'value-scout', rel),
        push(utc(sat, 10, 21), 'risk.reviewed', 'risk-officer', 'risk-officer', rel),
        push(utc(sat, 10, 40), 'decision.made', 'investment-committee', 'investment-committee', rel),
        push(utc(S, 18, 14), 'approval.stamped', 'sidd', null, rel, row.id),
        push(utc(S, 18, 15), 'row.published', 'script', null, rel, row.id)
      ];
      row.approved_at = row.chain[4].ts; row.committed_at = row.chain[5].ts; row.stamp = row.chain[4];
    }
  }
  ev.sort(function (a, b) { return a._k[0] < b._k[0] ? -1 : a._k[0] > b._k[0] ? 1 : a._k[1] - b._k[1]; });
  var shas = {};
  function sha(key) { // deterministic placeholder commit hash, one per release batch
    if (!shas[key]) { var h = 2166136261; for (var i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 2246822507); h ^= h >>> 13; h = Math.imul(h, 3266489909); h ^= h >>> 16; shas[key] = ('0000000' + (h >>> 0).toString(16)).slice(-7); }
    return shas[key];
  }
  ev.forEach(function (e, i) { e.id = 'E-' + (i + 1); e.sha = sha(e._k[2]); });
  ROWS.forEach(function (r) { r.approval_id = r.stamp.id; r.chain = r.chain.map(function (e) { return e.id; }); r.sha = sha('pub:' + r.id); });

  window.SAMPLE = {
    rows: ROWS, events: ev, utc: utc, add: add,
    week: { start: utc('2026-11-02', 0, 0), end: utc('2026-11-08', 23, 59), sunday: '2026-11-08', label: 'Nov 2 to Nov 8, 2026' },
    firstRow: '2026-07-05', cutover: CUTOVER, missed: MISSED,
    trayCount: ev.filter(function (e) { return e.type === 'chain.dropped' && (e.ts.length === 10 ? e.ts + 'T12:00:00Z' : e.ts) <= utc('2026-11-08', 23, 59); }).length, // chain.dropped events up to the sample cutoff: the No tray cutover: CUTOVER, missed: MISSED,
    monthsElapsed: 4, // Jul 5 to Nov 8
    // Sample-only count for the funnel: ideas the nightly script screen looked at from Jul 5 to Nov 8. Invented, like every number here; the ones that became memos are counted from the events, so the funnel's drops can't drift from the record.
    funnel: { ideasScreened: 91 },
    book: { start: 100000, perCall: 10000 },
    // design/07 "Never published": the paper account shows only as a reconciliation count (ADR amendment point 9), never a return.
    mirror: { signed: 3, placed: 3, due: 2, closedByScript: 2, manualFixes: 0, notMirrored: 3 }, // signed outperform calls; due = reached their horizon
    // design/07 "Reasoning for published calls": the shape of ledger/reasoning/C-n.json, kind 'call'.
    // Hand-written placeholder text on a placeholder ticker, so a reader can see what a published call carries. Not model output.
    reasoning: {
      'C-6': {
        kind: 'call', horizon: '3m',
        thesis: 'SMPL\u2019s latest quarterly filing shows inventory up 31% on the year while sales grew 4%, and management left full-year guidance unchanged. A company holding that much unsold stock usually discounts within two quarters, and discounting lands on gross margin. The sector fund holds peers that cleared their inventory last year, so the gap should show against both benchmarks.',
        why_now: 'The quarterly filing of Nov 5 is the first to show the build at this size, and the next report falls inside the 3-month horizon.',
        pillars: [
          { id: 'P1', must_remain_true: 'Inventory keeps growing faster than sales.', would_break_if: 'Next quarter\u2019s inventory growth falls below sales growth.' },
          { id: 'P2', must_remain_true: 'Clearing the stock costs gross margin.', would_break_if: 'Gross margin holds or rises in the next report.' },
          { id: 'P3', must_remain_true: 'Sector peers don\u2019t carry the same build.', would_break_if: 'Two or more large peers in the sector fund report a similar build.' }
        ],
        falsifiers: [
          { pillar_id: 'P1', falsifier: 'A disclosed bulk sale or write-down clears the excess before the next report.' },
          { pillar_id: 'P2', falsifier: 'The next report shows gross margin flat or up.' },
          { pillar_id: 'P3', falsifier: 'The sector fund\u2019s largest holdings show the same inventory trend.' }
        ],
        dissent: {
          counter_case: 'The build may be deliberate. The filing says the company bought ahead of a supplier price rise, and the holiday quarter could clear it at full price. If it does, margin holds and the stock tracks its sector. Three months is also a short window to bet against a sector that has been rising.',
          counter_falsifier: 'Inventory falls back in line with sales by the next report, with no drop in gross margin.'
        }
      }
    }
  };
})();
