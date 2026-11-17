/* The annotated call: sample call No. 6 as one document, every passage tagged by who wrote it. Text and times come from sample.js. */
(function () {
  var D = window.SAMPLE, root = document.getElementById('call-doc'); if (!D || !root) return;
  var row = D.rows.filter(function (r) { return r.id === 'C-6'; })[0], w = D.reasoning['C-6'];
  var ev = function (type) { return D.events.filter(function (e) { return row.chain.indexOf(e.id) >= 0 && e.type === type; })[0]; };
  var et = function (iso) { return new Date(iso).toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).replace(/,\s(?=\d+:)/, ' · ').replace(',', ',') + ' ET'; };
  var long = function (iso) { return new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' }); };
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function ps(kind, who, how, head, paras, cls) {
    var s = el('div', 'ps k-' + kind + (cls ? ' ' + cls : '')), tag = el('p', 'who'), body = el('div', 'body');
    tag.appendChild(el('b', '', who)); tag.appendChild(el('span', '', how));
    if (head) body.appendChild(el('h3', '', head));
    paras.forEach(function (p) { body.appendChild(typeof p === 'string' ? el('p', '', p) : p); });
    s.appendChild(tag); s.appendChild(body); root.appendChild(s); return s;
  }
  var chair = ev('decision.made'), stamp = ev('approval.stamped'), pub = ev('row.published'), fwd = ev('memo.forwarded');
  ps('model', 'Model', 'Written by the analyst model', 'The case', [w.thesis, w.why_now]);
  var c1 = el('p', 'ck', 'Every number in the case appears in the input the analyst was given. Passed.');
  var c2 = el('p', 'ck', 'The company is not on the restricted list. Passed.');
  var c3 = el('p', 'ck', 'Passed to the risk officer at ' + et(fwd.ts) + '.');
  ps('script', 'Script', 'Checked by a script', 'Checks before the risk officer', [c1, c2, c3]);
  ps('model', 'Model', 'Written by the risk officer model', 'The risk officer’s dissent', [w.dissent.counter_case], 'k-dis');
  ps('model', 'Model', 'Written by the chair model', 'The chair’s answer', ['Publish: ' + row.months + ' months, ' + row.confidence_bucket + ' confidence, ' + row.direction + '. Decided ' + et(chair.ts) + '.']);
  ps('model', 'Model', 'Written by the risk officer model', 'The dissent is right if:', [w.dissent.counter_falsifier], 'hl');
  var sg = el('p', 'sig', 'Sidd'), wh = el('p', 'at', 'Signed ' + et(stamp.ts) + ' · event ' + stamp.id);
  ps('person', 'Person', 'Signed by me', 'Signature', [sg, wh]);
  var sl = el('p', 'at', 'Sealed and published ' + et(pub.ts) + ' · commit ' + row.sha + ' (placeholder) · closes ' + long(row.horizon_end));
  ps('script', 'Script', 'Checked by a script', 'Sealed', [el('p', '', 'A script published the call, with a timestamp, before the market could answer it.'), sl]);
  root.appendChild(el('p', 'doc-note', 'Written by hand to show the format. No model wrote this. The ticker, the dates and the commit are placeholders.'));
})();
