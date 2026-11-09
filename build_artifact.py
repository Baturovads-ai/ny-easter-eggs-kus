"""Собирает index.html + styles.css + script.js + assets/*.png в одну страницу для Artifact.
Запуск: python3 build_artifact.py <out.html>  (out кладём вне папки проекта)."""
import base64, pathlib, re, sys

root = pathlib.Path(__file__).parent
html = (root / 'index.html').read_text(encoding='utf-8')
css = (root / 'styles.css').read_text(encoding='utf-8')
js = (root / 'script.js').read_text(encoding='utf-8')

head_keep = re.findall(r'(<meta name="claude:viewport-fit-sides"[^>]*>|<title>.*?</title>|<link rel="stylesheet" href="https://fonts[^>]*>)', html, re.S)
body = re.search(r'<body>(.*?)</body>', html, re.S).group(1)
body = re.sub(r'<script src="script.js[^>]*></script>', '', body)

def data_uri(m):
    name = m.group(1)
    b = (root / 'assets' / name).read_bytes()
    return 'src="data:image/png;base64,' + base64.b64encode(b).decode() + '"'
body = re.sub(r'src="assets/([a-z0-9_]+\.png)(?:\?v=\d+)?"', data_uri, body)

out = '\n'.join(head_keep) + '\n<style>\n' + css + '\n</style>\n' + body + '\n<script>\n' + js + '\n</script>\n'
pathlib.Path(sys.argv[1]).write_text(out, encoding='utf-8')
print(len(out) // 1024, 'KB')
