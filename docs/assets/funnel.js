/* The kill funnel: where the sample ideas went. Every count but the screened total is derived from sample.js events and rows,
   so it agrees with the record page's "stopped before publishing" stat (chain.dropped events). Mounts into every [data-funnel]. */
(function () {
  var D = window.SAMPLE; if (!D) return;
  var KEY = function (e) { return e.ts.length === 10 ? e.ts + 'T12:00:00Z' : e.ts; };
  var EV = D.events.filter(function (e) { return KEY(e) <= D.week.end; });
  var published = D.rows.filter(function (r) { return r.committed_at <= D.week.end; }).length;
  var drops = EV.filter(function (e) { return e.type === 'chain.dropped'; });
  var at = function (st) { return drops.filter(function (e) { return e.stage === st; }).length; };
  var screened = D.funnel.ideasScreened, memos = published + drops.length, byScreen = screened - memos;
  var risk = at('risk'), chair = at('committee'), unsigned = at('sidd'), script = at('script');
  var N = [
    { k: 'in', n: screened, t: 'Ideas screened', w: 'Every idea the nightly script screen looked at.', tone: 'in', bar: false },
    { k: 'scr', n: byScreen + script, t: 'Stopped by a script check', w: 'The screen or the checks on a memo failed, before any model argued.', tone: 'a' },
    { k: 'risk', n: risk, t: 'Vetoed by the risk officer', w: 'The risk officer model found a case it couldn’t pass.', tone: 'b' },
    { k: 'chair', n: chair, t: 'Declined by the chair', w: 'The chair model chose not to publish.', tone: 'c' },
    { k: 'sig', n: unsigned, t: 'Not signed by me', w: 'I read it and didn’t sign.', tone: 'd' },
    { k: 'pub', n: published, t: 'Published', w: 'Signed by me, sealed by a script.', tone: 'pub' }
  ];
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function build(root) {
    root.textContent = '';
    var fig = el('figure', 'fn'), bar = el('div', 'fn-bar'), ol = el('ol', 'fn-list');
    bar.setAttribute('aria-hidden', 'true');
    var drop = N.slice(1);
    drop.forEach(function (s) {
      if (s.n > 0) { var seg = el('i', 'fn-seg t-' + s.tone); seg.style.flexGrow = s.n; bar.appendChild(seg); }
    });
    N.forEach(function (s, i) {
      var li = el('li', 'fn-it t-' + s.tone + (s.n === 0 ? ' zero' : ''));
      var top = el('p', 'fn-n'), b = el('b', '', String(s.n));
      top.appendChild(b); li.appendChild(top);
      li.appendChild(el('p', 'fn-t', s.t));
      li.appendChild(el('p', 'fn-w', s.w));
      var m = el('i', 'fn-m'); m.setAttribute('aria-hidden', 'true'); m.style.setProperty('--p', Math.max(s.n / screened, .012)); li.appendChild(m);
      ol.appendChild(li);
    });
    var cap = el('figcaption', 'fn-cap', 'Sample counts, Jul 5 to Nov 8. ' + memos + ' ideas became memos, ' + drops.length + ' of them stopped before publishing and ' + published + ' were published. Once the desk runs, this is the real funnel.');
    fig.appendChild(bar); fig.appendChild(ol); fig.appendChild(cap); root.appendChild(fig);
    if (matchMedia('(prefers-reduced-motion:no-preference)').matches && 'IntersectionObserver' in window) {
      fig.classList.add('arm');
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { fig.classList.add('go'); io.disconnect(); } }, { threshold: .3 });
      io.observe(fig);
    }
  }
  [].forEach.call(document.querySelectorAll('[data-funnel]'), build);
  window.HLR_FUNNEL = { screened: screened, byScreen: byScreen, memos: memos, risk: risk, chair: chair, unsigned: unsigned, published: published, stopped: drops.length };
})();
