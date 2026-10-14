# Update the playable Before Dawn build on this site.
#   python3 scripts/update_before_dawn.py <web build dir>
# Copies the love.js web build into projects/before-dawn/play/.
# If GA_ID is set (your own Google Analytics measurement ID, G-...), also adds an analytics tag
# that only loads on wtl666wtl.github.io, so local previews are not counted.
import os
import shutil
import sys

FILES = ['index.html', 'game.js', 'game.data', 'love.js', 'love.wasm']
GA_ID = 'G-HCH7Z5DLZW'   # same as _includes/analytics.html; empty = no analytics
GA = '''  <script>
    // Google Analytics; live site only
    if (location.hostname === 'wtl666wtl.github.io') {
      var ga = document.createElement('script');
      ga.async = true;
      ga.src = 'https://www.googletagmanager.com/gtag/js?id=GA_ID';
      document.head.appendChild(ga);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { dataLayer.push(arguments); };
      gtag('js', new Date());
      gtag('config', 'GA_ID');
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
    if GA_ID:
        html = html.replace('</head>', GA.replace('GA_ID', GA_ID) + '</head>', 1)
    open(page, 'w', encoding='utf-8').write(html)
    print('Updated', os.path.normpath(dst))


if __name__ == '__main__':
    main(sys.argv[1])
