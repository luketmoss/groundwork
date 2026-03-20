# Groundwork — Personal Workout Tracker

A mobile-first workout tracker powered by Google Sheets. Track weight training (with templates, supersets, effort tracking), stretching, biking, and hiking — all backed by a shared Google Sheet for portable, human-readable data.

## Prerequisites

- [Node.js](https://nodejs.org/) 20+ (includes npm)
- Git
- A Google account (for OAuth and Sheets access)

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Static Web App │────▶│ Google Sheets API │────▶│  Google Sheets   │
│  (GitHub Pages) │     │ (via OAuth)       │     │  (Data Layer)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

| Layer | Technology | Hosting |
|-------|-----------|---------|
| Data | Google Sheets | Google |
| Frontend | Preact + Vite | GitHub Pages |
| Auth | Google OAuth 2.0 (GIS) | Google Cloud |

## Features

- **Weight Training**: Templates with supersets, rep ranges, effort tracking (Easy/Medium/Hard)
- **Other Workouts**: Stretching, biking, hiking with notes and timestamps
- **Exercise Library**: Multi-tag categorization (Push, Pull, Legs, Chest, Compound, etc.)
- **Workout Templates**: Named templates with sections (warmup, primary, superset, burnout)
- **Copy Previous**: Clone past workouts with "last time" reference for progressive overload
- **History**: Chronological workout log with type and tag filtering
- **Human-Readable Data**: One row per set in Google Sheets — easy to analyze, pivot, and chart

## Project Structure

```
groundwork/
├── frontend/             # Preact SPA
│   ├── src/
│   │   ├── api/          # Google Sheets REST API wrapper + types
│   │   ├── auth/         # Google OAuth (GIS token model)
│   │   ├── components/   # UI components
│   │   ├── router/       # Signal-based hash router
│   │   └── state/        # Preact signals store + actions
│   └── public/
├── scripts/              # Utility scripts
│   ├── seed-data.mjs     # Populate sheet with exercises & templates
│   └── sync-exercise-names.mjs  # Sync exercise names across tabs
└── .github/workflows/    # GitHub Pages deployment
```

## Setup

### 1. Google Sheet

Create a Google Sheet named **"Groundwork"** with five tabs:

| Tab | Headers (Row 1) |
|-----|----------------|
| **Exercises** | id, Name, Tags, Notes, Created |
| **Templates** | template_id, Template Name, Order, exercise_id, Exercise Name, Section, Sets, Reps, Rest (s), Group Rest (s), Created, Updated |
| **Workouts** | id, Date, Time, Type, Name, template_id, Notes, Duration (min), Created, copied_from |
| **Sets** | workout_id, exercise_id, Exercise Name, Section, Exercise Order, Set #, Planned Reps, Weight (lbs), Reps, Effort, Notes |
| **Config** | Key, Value |

### 1b. Seed Data (Optional)

Once your sheet exists, populate it with a starter exercise library and templates:

```bash
# Preview what will be written (no API calls)
node scripts/seed-data.mjs --dry-run

# Seed the sheet (requires a Google OAuth access token)
node scripts/seed-data.mjs <ACCESS_TOKEN>
```

> **Note:** The script has a hardcoded spreadsheet ID. Update the `SPREADSHEET_ID` constant in `scripts/seed-data.mjs` to match your sheet before running.

### 2. Google Cloud Project

1. Create a GCP project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable: **Google Sheets API**
3. Configure **OAuth consent screen** (External, Testing mode, add your account as test user)
4. Create an **OAuth client ID** (Web application) with authorized JavaScript origins:
   - `http://localhost:5173` (local dev)
   - `https://<username>.github.io` (production)

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Fill in VITE_GOOGLE_CLIENT_ID and VITE_SPREADSHEET_ID
npm run dev
```

Open http://localhost:5173/groundwork/ and sign in with Google.

### Demo Mode

To explore the app without setting up Google Cloud or a spreadsheet, use demo mode:

```
http://localhost:5173/groundwork/?demo=true
```

Demo mode provides a fake user and sample data. No Google auth required — changes are not persisted.

You can also enable it via `.env.local`:

```
VITE_DEMO_MODE=true
```

### 4. GitHub Pages (Production)

1. Set GitHub Pages source to **GitHub Actions** in repo settings
2. Add repository secrets:
   - `VITE_GOOGLE_CLIENT_ID` — your OAuth client ID
   - `VITE_SPREADSHEET_ID` — your Google Sheet ID
3. Push to `main` — the workflow builds and deploys automatically

## Development

```bash
cd frontend
npm test              # run tests (vitest)
npm run test:watch    # watch mode
npx tsc --noEmit      # type-check without emitting
npm run build         # production build to frontend/dist/
```

## Google Sheets Schema

### Sets (one row per set — core tracking data)

| Column | Header | Example |
|--------|--------|---------|
| A | workout_id | w_20260314_1 |
| B | exercise_id | ex_dbb |
| C | Exercise Name | DB Bench Press |
| D | Section | primary |
| E | Exercise Order | 4 |
| F | Set # | 1 |
| G | Planned Reps | 4-6 |
| H | Weight (lbs) | 70 |
| I | Reps | 6 |
| J | Effort | Medium |
| K | Notes | Last rep was grinder |

Filter by Exercise Name to see progression. Pivot on workout_id for volume. Chart Weight over time.

## License

Private — personal use.
