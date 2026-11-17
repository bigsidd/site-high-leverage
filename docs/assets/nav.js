/* Phone header: one row with a Menu button; the nav opens below it. Desktop shows the nav and never sees the button.
   Escape or a tap outside the bar closes it; opening moves focus to the first link. */
(function () {
  var b = document.querySelector('.bar .menu'); if (!b) return;
  var bar = b.closest('.bar');
  function set(o, focus) {
    bar.classList.toggle('open', o); b.setAttribute('aria-expanded', o ? 'true' : 'false');
    if (o) { var a = bar.querySelector('nav a'); if (a) a.focus(); } else if (focus) b.focus();
  }
  b.addEventListener('click', function () { set(!bar.classList.contains('open')); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && bar.classList.contains('open')) set(false, true); });
  document.addEventListener('pointerdown', function (e) { if (bar.classList.contains('open') && !bar.contains(e.target)) set(false); });
})();
