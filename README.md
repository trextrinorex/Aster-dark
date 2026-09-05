# AFTER DARK

> **THE NIGHT IS DISAPPEARING.**

AFTER DARK is an immersive, open visualization experience about Earth's disappearing night and the spread of artificial light.

## What is here now

- Cinematic dark-space visual language and scientific HUD
- Interactive WebGL Earth built with Three.js
- Atmospheric shell, stars, night-light points and orbital-style framing
- Historical year scrubber from 1992 → 2026
- Regional exploration panel
- Four light-pollution concepts: sky glow, glare, trespass and clutter
- Interactive night-sky pollution control
- "Restore the Night" city-light scenario
- Responsive layout and reduced-motion support
- GitHub Pages deployment workflow

## Experience map

`01 THE NIGHT` → `02 EARTH AT NIGHT` → `03 THE LIGHTS` → `04 FOLLOW THE DATA` → `05 WHAT WE'RE LOSING` → `06 MORE THAN A VIEW` → `07 RESTORE THE NIGHT` → `08 TAKE ACTION`

## Design direction

The project is inspired by the principles of cinematic scientific visualization: Earth as the emotional anchor, restrained telemetry, monospaced instrumentation, large negative space, data-led storytelling and a single high-salience warm-light accent. It is an original implementation rather than a pixel-for-pixel recreation of another design.

## Technology

The current build is deliberately lightweight and static: semantic HTML, CSS and native ES modules with Three.js loaded from a CDN. This makes the first experience easy to deploy on GitHub Pages without a build server.

## Data roadmap

The current visual layer is a prototype visualization so that the interaction system can be developed independently of a final dataset. The next data phase should replace the generated night-light distribution with validated satellite observations, document the exact dataset/version/resolution, and expose source metadata beside each scientific visualization.

Candidate sources include NASA/NOAA night-light observations, historical DMSP-OLS products, VIIRS products, and appropriate public geospatial datasets.

## Run locally

Because the app uses ES modules, serve the repository through a local HTTP server rather than opening `index.html` directly. For example:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Deployment

A GitHub Actions workflow in `.github/workflows/deploy.yml` publishes the static site to GitHub Pages whenever `main` changes. Enable **Settings → Pages → GitHub Actions** if Pages has not already been enabled for the repository.

## License

MIT
