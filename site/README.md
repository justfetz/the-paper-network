# site/

The dashboard. `index.html` + `data.js` + `ui.js` (no build step, d3 from cdnjs). `artifact.html` is the same page with
everything inlined (used for the claude.ai artifact). Rebuild after a model run:

```bash
python build_site.py ../data/paper_network.json ../data/basemap.json
```

GitHub Pages: Settings → Pages → Deploy from branch → `main` / `/site`. The page then serves at
https://justfetz.github.io/the-paper-network/. `src/` holds the editable pieces: `index.template.html` (markup
and copy), `ui.css` (tokens and layout), `ui_core.js` (data access, map, flows tab), `ui_tabs.js` (the other tabs).
