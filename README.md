# Library Shelving Loadout Manager

Cross-platform (desktop & mobile via PWA) web application to track daily shelving / pulling activity across library sections and automatically build cart "loadouts" (carts of up to 6 rows) for operational planning.

## Core Concepts

Locations (plain names only):

1. Third Floor
2. Second Floor
3. South Basement J-NX
4. North Basement
5. New One
6. Movables
7. Bound Journals
8. Documents
9. Special (capped at 3 rows per day)
10. Oversize (capped at 2 rows per day)

An entry = (date, rows) for a section on a given day.

Loadouts = virtual carts each holding up to 6 row units. Rows are allocated in defined section order. (Future improvement: smarter grouping / balancing.)

## Tech Stack

- Frontend: React + TypeScript + Vite (PWA-ready, responsive for mobile & desktop; installable)
- State: Minimal client state (Zustand) + server persistence
- Backend: Express + TypeScript (JSON file persistence for now)
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

### Production (Compose)

```powershell
docker compose -f docker-compose.prod.yml up --build -d
```

### Backups

Run the backup script (creates `backups/data-<timestamp>.json`):

```powershell
powershell -File scripts/backup-data.ps1
```

### Hardened Image

The production stage runs as non-root `node` user and prunes dev dependencies. Health check hits `/api/health`.

## API Overview

GET /api/sections -> list sections with today's and recent entries

POST /api/entries { sectionId, date, rows } -> add/update (enforces caps for Special & Oversize)

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
