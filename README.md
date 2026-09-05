# AFTER DARK

> **THE NIGHT IS DISAPPEARING.**

AFTER DARK is an immersive, open visualization experience about Earth's disappearing night and the spread of artificial light.

## What is here now

- Cinematic dark-space visual language and scientific HUD
- Interactive WebGL Earth built with Three.js
- Atmospheric shell, stars, night-light reference layer and orbital-style framing
- Historical year scrubber from 1992 → 2026
- Regional exploration panel
- Planet → city exploration
- Interactive night-sky pollution control
- Restore-the-Night scenario
- Responsive layout and reduced-motion support
- Automated JavaScript/HTML smoke validation
- GitHub Pages deployment workflow

## Validation

Every push and pull request runs a lightweight smoke suite that checks JavaScript syntax, required DOM IDs, duplicate IDs, scene numbering, asset references, reduced-motion support and responsive CSS. This catches common regressions before deployment.

## Deployment

The Pages workflow uses the current GitHub Pages artifact/deploy actions. **GitHub Pages itself must be enabled for this repository with Source = GitHub Actions** before the deployment workflow can publish. GitHub's documentation confirms that custom Pages workflows require Pages to be configured for GitHub Actions.

## Data status

The current night-light reference layer uses NASA Earth-at-night imagery for visual grounding. Historical labels distinguish DMSP-OLS context from the VIIRS era. UI indices are explicitly treated as illustrative/scenario values until gridded satellite products are ingested and calculations are derived directly from those datasets.

## Run locally

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Experience map

`01 THE NIGHT` → `02 EARTH AT NIGHT` → `03 THE LIGHTS` → `04 FOLLOW THE DATA` → `05 YOUR WORLD` → `06 WHAT WE'RE LOSING` → `07 MORE THAN A VIEW` → `08 RESTORE THE NIGHT` → `TAKE ACTION`

## License

