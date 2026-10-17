# Minor Project 03 – Weather App + Movie Search App

Two responsive, API-driven web apps built with **HTML5, CSS3 and vanilla JavaScript (ES6+)**.

## Features

### Weather App (`weather.html`)
- Search weather by city name
- Current temperature, conditions, feels-like, **humidity** and **wind speed**
- 5-day forecast and °C / °F toggle
- Graceful handling of unknown cities, network and API errors
- Remembers your last city and unit
- API: [Open-Meteo](https://open-meteo.com/) (geocoding + forecast) – **no API key needed**

### Movie Search App (`movies.html`)
- Search movies via the OMDb API
- Posters, titles, **ratings** and **release information**
- Click a card for full details (plot, cast, director, runtime, genre)
- Handles invalid/short queries, "movie not found", too-many-results, invalid key and rate-limit errors
- "Load more" pagination
- API: [OMDb](https://www.omdbapi.com/) – **free API key required**

## Getting started

1. **Get an OMDb key** (free): https://www.omdbapi.com/apikey.aspx
   Either put it in `js/config.js` or paste it into the key box in the app (saved in your browser's localStorage).
2. **Serve the folder over HTTP** (ES modules do not work from `file://`):
   ```bash
   # Python
   python -m http.server 8000
   # or Node
   npx serve .
   ```
   or use the VS Code **Live Server** extension. Then open http://localhost:8000.

## Project structure

```
minor-project-03/
├── index.html        # Home page linking to both apps
├── weather.html      # Weather app page
├── movies.html       # Movie search page
├── css/styles.css    # Shared responsive styles
└── js/
    ├── utils.js      # Shared helpers (fetchJson, escapeHtml, UI messages)
    ├── weather.js    # Weather app logic
    ├── movies.js     # Movie search logic
    └── config.js     # OMDb API key (optional)
```

## Requirements checklist

| Area | Where it is demonstrated |
|------|--------------------------|
| Arrow functions | Throughout `js/*.js` |
| Template literals | UI rendering in `weather.js`, `movies.js` |
| Destructuring | API response handling (`const { Search, totalResults } = data`) |
| Modules | `import` / `export` across `js/` files |
| DOM manipulation | Dynamic rendering, event delegation, modal, form handling |
| Promises | `Promise.allSettled` to fetch movie details in parallel |
| Async/Await + Fetch API | `getCoordinates`, `getWeather`, `searchMovies`, `getDetails` |
| Error handling | `try/catch/finally`, friendly messages for each failure type |
| JSON handling | Parsing and mapping Open-Meteo / OMDb responses |
| Responsive UI | CSS grid + media queries in `css/styles.css` |

## Submission

1. Create a GitHub repository and push this folder:
   ```bash
   git init
   git add .
   git commit -m "Minor Project 03: Weather + Movie Search apps"
   git branch -M main
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
2. Submit the repository link via the Minor Project 03 Google Form **before 20/06/2026**.

## Tech stack
HTML5 · CSS3 · JavaScript (ES6+) · Open-Meteo API · OMDb API · Git & GitHub
