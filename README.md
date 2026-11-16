# Raylos’Clo

Static site with no build step. Deploy the folder as-is.

```
index.html        app markup (login screen + app shell)
404.html          not-found page (uses root-absolute /paths so it works at any URL)
config.json       Supabase URL + publishable key, fetched at runtime by js/app.js
css/
  base.css        font, color tokens, reset, typography, top bar, buttons
  login.css       login screen
  shell.css       framed app window: sidebar nav, top search bar, main layout
  dashboard.css   bento dashboard tiles + ring charts
  board.css       items pipeline board, cards, tables, forms, dialogs
  charts.css      money charts
  photos.css      item photos + frames
  kit.css         listing kit dialogs, badges, sync status, drag-and-drop
  motion.css      animations (all skipped for reduced-motion visitors)
  responsive.css  tablet/phone breakpoints (keep this linked last)
  404.css         404 page only
js/
  app.js          the whole app (storage, cloud sync, views, dialogs, auth)
  404.js          404 cat animation
assets/
  fonts/karumbi.woff
  img/            logo, wordmark, rack illustration, item icons
  img/404/        404 cat pieces
```

The stylesheets in `index.html` are linked in cascade order. If you add a file, put it before `responsive.css`.

`js/app.js` keeps the `/*__MOCK__*/` and `/*__MOCKPHOTOS__*/` placeholders that the mock (fake-data) build fills in.
