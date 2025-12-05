# Japan Trip Companion

Lightweight Node + Prisma API with a React (Vite) frontend to plan and track a Japan trip. Built for quick itinerary glances, checklists, and shared moments.

## Structure
- `backend/`: Express API with Prisma + PostgreSQL (dev uses SQLite). Models for trips, days, activities, checklist, expenses, media, ideas, cities, and places.
- `frontend/`: React + Vite (JS) UI styled with Chakra (dark coral/indigo theme) showing hero dashboard, itinerary timeline, checklist, spend view, Calendar, Places (list + map), and Ideas board.

## Current features
- Dashboard: trip hero with day timeline, checklist, bookings, spend, and moments sections.
- Calendar: month-style view of days/activities with quick add/edit.
- Cities: manage trip stops and ordering.
- Places: list + map view, search/sort/group, favorites, paste-a-map-link intake, promote to activity, edit/delete, tag enum shared with ideas/activities, city required.
- Ideas board: drag/drop reorder, filter by city, save-as-place, promote to activity.
- Bookings, checklist, expenses: add/edit/delete where supported with toasts and validation.

## Quick start
1) Backend
```bash
cp backend/.env.example backend/.env       # set DATABASE_URL for Postgres
cd backend
npm install                                # installs express, prisma, etc.
npx prisma generate
npx prisma db push                         # creates/updates the Postgres schema
npx prisma db seed                         # seeds a sample trip/day/activities/checklist/expenses
npm run dev                                # http://localhost:4000
```

2) Frontend (in a new shell)
```bash
cd frontend
npm install
npm run dev                                # http://localhost:5173
```

3) Root (run both API + client together)
```bash
npm install          # installs root dev tool npm-run-all
npm run dev          # runs backend dev + frontend dev in parallel
```

## API sketch
- `GET /trips` – list trips (with days, activities, checklist, expenses, media)
- `POST /trips` – create a trip `{ name, startDate?, endDate?, homeTimeZone? }`
- `GET /trips/:id` – fetch trip detail
- `POST /trips/:id/days` – add day `{ date, title?, note? }`
- `POST /days/:id/activities` – add activity `{ title, description?, startTime?, endTime?, location?, category? }`
- `PATCH /activities/:id` – update activity fields
- `DELETE /activities/:id` – delete activity
- `POST /trips/:id/checklist` – add checklist item `{ title, category? }`
- `PATCH /checklist/:id/toggle` – toggle done flag
- `POST /trips/:id/expenses` – add spend `{ amount, currency?, category?, note?, incurredAt? }`
- `POST /trips/:id/media` – add media `{ url, caption?, location?, takenAt? }`
- `GET /trips/:id/bookings` – list bookings for trip
- `POST /trips/:id/bookings` – add booking `{ title, type?, dateTime?, location?, confirmationCode?, link?, note?, dayId? }`
- `DELETE /bookings/:id` – remove booking
- `GET /trips/:id/cities` – list cities/stops for a trip
- `POST /trips/:id/cities` – add city `{ name, country?, startDate?, endDate?, notes? }`
- `PATCH /cities/:id` – update city fields/position
- `POST /trips/:id/cities/reorder` – persist city order `{ order: [cityId] }`
- `DELETE /cities/:id` – remove city
- `GET /trips/:id/ideas` – list wishlist items
- `POST /trips/:id/ideas` – add idea `{ title, link?, note?, category? }`
- `PATCH /ideas/:id` – update idea fields, status, or category
- `POST /ideas/:id/promote` – create an activity from an idea `{ dayId, startTime?, location?, category? }`
- `DELETE /ideas/:id` – remove idea
- `GET /trips/:id/places` – list saved places
- `POST /trips/:id/places` – add place `{ name, address?, lat?, lng?, tag?, link?, notes?, cityId }`
- `PATCH /places/:id` – update place
- `DELETE /places/:id` – remove place
- `POST /places/:id/promote` – create an activity from a place `{ dayId, startTime?, location?, category? }`

## Planning to-dos (future features)
- Saved places library: **done** (list+map with clustering toggle, search/sort/group, favorites, paste-from-link, promote to activity; next: server favorites, drag-to-day).
- Ideas board: **done** (drag/drop reorder, city filter, save-as-place, promote to activity; next: bulk promote, richer statuses).
- Map-first planning: **done** (places map view with clustering and quick add-to-day from map; next: drag-to-day assignment if desired).
- Day builder with travel times: **in progress** (activity reorder with persisted position, start/end times, durations, overbook warnings, basic travel estimates). Next: better travel heuristics and add-from-search/map.
- Routing/UX: add React Router for multi-page navigation and smoother reload handling.
- Auth + trip workspace: add user auth and trip creation/selection flow so users can sign in and manage multiple trips.
- Booking vault: upload/attach PDFs/PNRs/QRs (flights, hotels, rail, museum tickets), show on the right day, offline cache.
- Packing + shopping lists: templates by season/region, split bring vs. buy-in-Japan, auto weather-driven items.
- Budget + currency: daily spend targets, category budgets, quick JPY conversion, highlight hot spend days.
- Weather + local time: per-city weather, current local time, last-train cutoffs for key lines.
- Checklists tied to days: pre-day todos and “next 24h” strip for reminders.
- Sharing: read-only share links or invites; optional album link for Moments.
- Smart reminders: push/email for flights/hotels/timed tickets; “leave by” alerts using transit times.
- Offline-first: cache itinerary/PNRs/checklists for subway use.
- Seed/import: CSV/ICS paste for flights/hotels to auto-create activities.
- Multi-city routing: visualize order of cities, distance/time between stops, and smart reorder suggestions.
- PDF/export: printable itinerary and offline bundle (bookings + QR codes), plus calendar (.ics) export.
- Collaboration: invite-based editing, comments on activities/bookings, and activity-level reactions.
- Lodging timeline: show all stays on a horizontal timeline to catch gaps/overlaps.
- Nearby recs: suggest spots near bookings/activities and surfacing open-now options.
- Driving/transit estimates: mode selection with time + cost estimates and “leave by” callouts.
