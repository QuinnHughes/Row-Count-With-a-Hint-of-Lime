# Library Shelving Loadout Manager

Cross-platform (desktop & mobile via PWA) web application to track daily shelving / pulling activity across library sections and automatically build cart "loadouts" (carts of up to 6 rows) for operational planning.

## Core Concepts

Sections (location/type groupings):

1. A–GV (3rd floor, overflow trucks)
2. H–HX (2nd floor, overflow trucks)
3. J–NX (basement movable shelves)
4. P–Z (movable shelves near study room)
5. A–Z (white stripes carts & shelves)
6. Documents (movable shelves after bound journals)
7. CHYAC/Reference (N10 wall, special rows, capped at 3 rows per day)
8. Oversize (2nd floor rough shelving area, capped at 2 rows per day)

An entry = (date, rows) for a section on a given day.

Loadouts = virtual carts each holding up to 6 row units. Rows are allocated in defined section order. (Future improvement: smarter grouping / balancing.)

## Tech Stack

- Frontend: React + TypeScript + Vite (PWA-ready, responsive for mobile & desktop; installable)
- State: Minimal client state (Zustand) + server persistence
- Backend: Express + SQLite (better-sqlite3)
- Validation: zod
- Container: Single Docker image (multi-stage) builds client then serves via Node/Express

## Quick Start (Dev w/ Docker)

```powershell
docker compose up --build
```

Then open: http://localhost:5173 (Vite dev server) or API at http://localhost:8080/api/sections

### Windows Native Module Note
The server uses better-sqlite3 (native). If you develop outside Docker on Windows you'll need VS Build Tools. Easiest path: stay inside Docker (recommended) or use Node 20 with `nvm`, not Node 24+ (prebuilt binaries more available). A future option is swapping to a pure JS layer if desired.

## Production Build

```powershell
docker build -t shelving-app .
docker run -p 8080:8080 shelving-app
```

Then open: http://localhost:8080 (served static bundle + API)

## API Overview

GET /api/sections -> list sections with today's and recent entries

POST /api/entries { sectionId, date, rows } -> add/update (enforces caps for CHYAC/Reference & Oversize)

GET /api/loadouts?date=YYYY-MM-DD -> derived carts for a date

## Environment Variables (optional)

- PORT (default 8080)
- DB_FILE (default data.sqlite)

## Data Model (Current JSON Store)

Persisted in `data.json` (lightweight dev store – swap for a real DB later):

sections: [{ id, code, name, daily_cap, order_index }]
entries: [{ id, section_id, date(YYYY-MM-DD), rows, created_at, updated_at }]

You can safely delete `data.json` to reset.

## Added Utilities

Health check: GET /api/health -> { ok: true }

Sample data (after starting dev):
```powershell
node server/dist/sampleData.js 2025-01-01
```

## Future Enhancements

- User auth / shift attribution
- Editing historical entries & audit log
- Partial row tracking (fractions)
- Export (CSV / spreadsheet sync)
- Advanced loadout optimization (balance floor locations per cart)
- Offline sync (service worker queue)

## Dev Notes

The dev Docker setup runs client & server concurrently with hot reload (volumes mounted). Production image bakes static assets.

## License

MIT (add if desired)
