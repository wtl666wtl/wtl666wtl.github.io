# Update the playable Before Dawn build on this site.
#   python3 scripts/update_before_dawn.py <web build dir>
# Copies the love.js web build into projects/before-dawn/play/ and adds the site's Google Analytics tag.
# The tag only loads on wtl666wtl.github.io, so local previews are not counted.
import os
import shutil
import sys

FILES = ['index.html', 'game.js', 'game.data', 'love.js', 'love.wasm']
GA = '''  <script>
    // Google Analytics, same property as the homepage; live site only
    if (location.hostname === 'wtl666wtl.github.io') {
      var ga = document.createElement('script');
      ga.async = true;
      ga.src = 'https://www.googletagmanager.com/gtag/js?id=G-E00L9PT3V9';
      document.head.appendChild(ga);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { dataLayer.push(arguments); };
      gtag('js', new Date());
      gtag('config', 'G-E00L9PT3V9');
    }
  </script>
'''


def main(src):
    dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'projects', 'before-dawn', 'play')
    os.makedirs(dst, exist_ok=True)
    for name in FILES:
        shutil.copyfile(os.path.join(src, name), os.path.join(dst, name))
    page = os.path.join(dst, 'index.html')
    html = open(page, encoding='utf-8').read()
    assert '</head>' in html and 'googletagmanager' not in html, 'unexpected index.html'
    open(page, 'w', encoding='utf-8').write(html.replace('</head>', GA + '</head>', 1))
    print('Updated', os.path.normpath(dst))


if __name__ == '__main__':
    main(sys.argv[1])
