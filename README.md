# TrendTalks

TrendTalks is an open-source trend intelligence workspace for discovering GitHub repositories and inspecting the public conversations around them.

## Product workflow

- Rank repositories by conversation velocity.
- Search by repository, topic, or language.
- Filter by time range and programming language.
- Inspect source-specific conversations from Hacker News, Reddit, and Stack Overflow.
- Save a browser-local watchlist without creating an account.

## Local demo

The demo uses synthetic fixtures and does not contact GitHub or conversation sources.

```bash
npm install
npm run demo
```

Open `http://localhost:3000`.

## Live mode

```bash
npm start
```

Live mode scrapes GitHub Trending and retrieves public search results from the supported source routes. These sources may rate-limit requests or change their public response formats.

## Validation

```bash
npm test
```

## Architecture

- `api/index.js` — Express application and route registration.
- `services/trending-service.js` — normalized GitHub discovery and short-lived caching.
- `data/demo-repositories.js` — local-only synthetic demo data.
- `views/index.ejs` — semantic workspace shell.
- `public/js/index.js` — filters, tabs, safe source rendering, and the versioned local watchlist.
- `public/stylesheets/` — design tokens and responsive Workbench layout.
