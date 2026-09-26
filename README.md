# Tianle Wang — academic homepage

A GitHub Pages / Jekyll academic homepage. The original template was based on Jekyll Now and Jon Barron's website. Image and publication copyrights remain with their respective owners.

## Content and layout

- `index.html` is the single homepage entry point.
- `_layouts/default.html` contains the profile and publication layout.
- `style.scss` contains the responsive styles.
- `projects/index.html` is the Projects index linked from the main navigation. Add a record to `_data/projects.yml` when a new project page is ready; it automatically gets a card. `demo` is optional. Add its `website` URL to the matching publication to surface a Project page link on the homepage.
- `_publications/*.markdown` contains the four selected publications, ordered by date. Edit `summary`, `venue_short`, and resource links here; full author lists are preserved.
- `_config.yml` configures metadata and the non-output publications collection.
- `projects/scalelogic/` is the independent ScaleLogic paper page. Its `index.html`, `project.css`, and `project.js` contain the content, styles, and lightweight interactions; `assets/` contains the paper figures (source mapping in `assets/SOURCES.md`). The homepage links to it through the paper's `website` field.
- The project’s `proof-explorer.js` / `proof-explorer.css` implement the interactive proof graph. Its 150-example bank is rebuilt with `python scripts/export-proof-examples.py --source ../searchRL` (Python standard library plus the source repository; no model service). Each exported inference is checked independently.
- Inherited `_posts` remain in the repository but are excluded from the generated site. This replaces the old `permalink: /` workaround, where many posts overwrote the same homepage.

## Local preview without Ruby

Requires Node.js. Install the preview dependencies once:

```powershell
npm install --prefix _temp --cache _temp/npm-cache --no-audit --no-fund liquidjs yaml sass
node scripts/preview.mjs
```

Open http://127.0.0.1:4173 or http://127.0.0.1:4173/projects/scalelogic/. The preview reads source files on each request; refresh after editing. It checks the homepage, project index, and ScaleLogic page template rendering, Sass compilation, the four expected publications, and case-sensitive local asset paths. For validation only, run `node scripts/preview.mjs --check`.

This lightweight LiquidJS preview is not a complete Jekyll build. GitHub Pages uses Jekyll to generate the production site, including its sitemap. Google Analytics is enabled only in Jekyll's production environment. Preview tooling and `_temp` are excluded from the published site.

## Profile icons

Google Scholar, GitHub, and LinkedIn SVG paths are from [Simple Icons v11.15.0](https://github.com/simple-icons/simple-icons/tree/11.15.0), distributed under [CC0](https://github.com/simple-icons/simple-icons/blob/11.15.0/LICENSE.md). The envelope is drawn locally. All profile icons are inline SVGs, use the link color, and are hidden from assistive technology because the visible link text supplies the accessible name.
