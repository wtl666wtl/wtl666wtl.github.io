import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, '_temp', 'package.json'));
const { Liquid } = require('liquidjs');
const YAML = require('yaml');
const sass = require('sass');
const read = p => fs.readFileSync(path.join(root, p), 'utf8').replace(/^\uFEFF/, '');
const frontmatter = source => YAML.parse(source.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1]);
function validateAssets(html, route='/') {
  for (const [,url] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^(https?:|mailto:|data:|#|\/\/)/.test(url)) continue;
    const pathname = decodeURIComponent(new URL(url, 'http://localhost' + route).pathname);
    if (pathname === '/' || pathname === '/style.css') continue;
    const parts = pathname.slice(1).split('/').filter(Boolean);
    let dir = root;
    for (const part of parts) {
      if (!fs.readdirSync(dir).includes(part)) throw new Error('Missing or incorrectly cased asset: ' + url);
      dir = path.join(dir, part);
    }
    if (fs.statSync(dir).isDirectory() && !fs.existsSync(path.join(dir,'index.html'))) throw new Error('Missing page: ' + url);
  }
}
async function renderProject(file = 'projects/scalelogic/index.html', route = '/projects/scalelogic/') {
  const site = YAML.parse(read('_config.yml'));
  site.data = {projects: YAML.parse(read('_data/projects.yml'))};
  const liquid = new Liquid();
  liquid.registerFilter('relative_url', value => /^https?:/.test(value) ? value : site.baseurl + '/' + value.replace(/^\//, ''));
  const html = await liquid.parseAndRender(read(file).replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, ''), {site});
  if (/\{[{%]/.test(html)) throw new Error('Unresolved project template');
  validateAssets(html, route);
  return html;
}
async function render() {
  const site = YAML.parse(read('_config.yml'));
  site.publications = fs.readdirSync(path.join(root, '_publications')).filter(f => f.endsWith('.markdown')).map(f => frontmatter(read('_publications/' + f)));
  const liquid = new Liquid();
  liquid.registerFilter('relative_url', value => /^https?:/.test(value) ? value : site.baseurl + '/' + value.replace(/^\//, ''));
  const html = await liquid.parseAndRender(read('_layouts/default.html'), {site, jekyll:{environment:'development'}});
  const css = sass.compileString(read('style.scss').replace(/^---\r?\n---\r?\n/, ''), {style:'compressed'}).css;
  if ((html.match(/<article /g) || []).length !== 4) throw new Error('Expected four publications');
  if (/\{[{%]/.test(html)) throw new Error('Unresolved template');
  validateAssets(html);
  return {html, css};
}
const initial = await render();
await renderProject();
await renderProject('projects/index.html', '/projects/');
fs.mkdirSync(path.join(root, '_temp'), {recursive:true});
fs.writeFileSync(path.join(root, '_temp', 'preview.html'), initial.html);
console.log('Validated homepage, project index, ScaleLogic project page, Sass, four publications, and local asset paths.');
if (!process.argv.includes('--check')) {
  const types = {'.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.pdf':'application/pdf','.ico':'image/x-icon','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'};
  http.createServer(async (req,res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      if (pathname === '/projects') {
        res.writeHead(301, {'Location':'/projects/'}); res.end(); return;
      }
      if (pathname === '/projects/' || pathname === '/projects/index.html') {
        res.writeHead(200, {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
        res.end(await renderProject('projects/index.html', '/projects/')); return;
      }
      if (pathname === '/projects/scalelogic') {
        res.writeHead(301, {'Location':'/projects/scalelogic/'}); res.end(); return;
      }
      if (pathname === '/projects/scalelogic/' || pathname === '/projects/scalelogic/index.html') {
        res.writeHead(200, {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
        res.end(await renderProject()); return;
      }
      if (pathname === '/' || pathname === '/style.css') {
        const output = await render();
        res.writeHead(200, {'Content-Type':pathname === '/' ? 'text/html; charset=utf-8' : 'text/css; charset=utf-8','Cache-Control':'no-store'});
        res.end(pathname === '/' ? output.html : output.css);
        return;
      }
      const file = path.resolve(root, '.' + pathname);
      if (!file.startsWith(root + path.sep) || !/^\/(images|tn\/images|pdfs|projects\/scalelogic)\//.test(pathname) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        res.writeHead(404); res.end('Not found'); return;
      }
      res.writeHead(200, {'Content-Type':types[path.extname(file)] || 'application/octet-stream'});
      fs.createReadStream(file).pipe(res);
    } catch(error) { res.writeHead(500); res.end('Preview error'); console.error(error); }
  }).listen(4173,'127.0.0.1', () => console.log('Preview: http://127.0.0.1:4173'));
}
