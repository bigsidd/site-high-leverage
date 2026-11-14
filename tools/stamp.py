"""Cache-busting: stamps every asset URL in docs/ with ?v=<first 8 hex of its md5>.
Pages serves files with max-age=600, so a changed file needs a changed URL to reach readers right away.
Run before shipping: python3 tools/stamp.py   (idempotent; prints what changed)"""
import hashlib, pathlib, re
docs = pathlib.Path(__file__).resolve().parent.parent / 'docs'
h = lambda p: hashlib.md5(p.read_bytes()).hexdigest()[:8]
def stamp(path, pattern, base):
    s = path.read_text(); t = re.sub(pattern, lambda m: m.group(1) + m.group(2) + '?v=' + h(base / m.group(2)) + m.group(4), s)
    if t != s: path.write_text(t); print('stamped', path.relative_to(docs.parent))
# fonts inside the stylesheet first, so the stylesheet's own hash covers its font URLs
stamp(docs / 'assets/fonts.css', r'(url\()(fonts/[^)?]+)(\?v=[0-9a-f]+)?(\))', docs / 'assets')
for page in sorted(docs.glob('*.html')):
    stamp(page, r'((?:href|src|content)="(?:https://research\.siddharthshah\.me/)?)(assets/[^"?]+)(\?v=[0-9a-f]+)?(")', docs)
