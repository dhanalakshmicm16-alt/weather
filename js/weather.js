import { $, escapeHtml, fetchJson, showLoading, showMessage } from "./utils.js";

// Open-Meteo: free, no API key required
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

// WMO weather codes -> description + emoji
const WEATHER_CODES = {
  0: ["Clear sky", "☀️"],
  1: ["Mainly clear", "🌤️"],
  2: ["Partly cloudy", "⛅"],
  3: ["Overcast", "☁️"],
  45: ["Fog", "🌫️"],
  48: ["Rime fog", "🌫️"],
  51: ["Light drizzle", "🌦️"],
  53: ["Drizzle", "🌦️"],
  55: ["Heavy drizzle", "🌧️"],
  56: ["Freezing drizzle", "🌧️"],
  57: ["Freezing drizzle", "🌧️"],
  61: ["Light rain", "🌦️"],
  63: ["Rain", "🌧️"],
  65: ["Heavy rain", "🌧️"],
  66: ["Freezing rain", "🌧️"],
  67: ["Freezing rain", "🌧️"],
  71: ["Light snow", "🌨️"],
  73: ["Snow", "❄️"],
  75: ["Heavy snow", "❄️"],
  77: ["Snow grains", "❄️"],
  80: ["Rain showers", "🌦️"],
  81: ["Rain showers", "🌧️"],
  82: ["Violent showers", "⛈️"],
  85: ["Snow showers", "🌨️"],
  86: ["Snow showers", "🌨️"],
  95: ["Thunderstorm", "⛈️"],
  96: ["Thunderstorm with hail", "⛈️"],
  99: ["Thunderstorm with hail", "⛈️"],
};

const describe = (code) => WEATHER_CODES[code] ?? ["Unknown", "❓"];

// ---- DOM references ----
const form = $("#search-form");
const input = $("#city-input");
const button = $("#search-btn");
const result = $("#result");

// ---- State ----
let state = { place: null, weather: null, unit: "C" };

// ---- Unit helpers (arrow functions) ----
const toF = (c) => (c * 9) / 5 + 32;
const toMph = (kmh) => kmh * 0.621371;
const formatTemp = (c) => `${Math.round(state.unit === "C" ? c : toF(c))}°${state.unit}`;
const formatWind = (kmh) =>
  state.unit === "C" ? `${Math.round(kmh)} km/h` : `${Math.round(toMph(kmh))} mph`;

// ---- API calls (async/await + error handling) ----
const getCoordinates = async (city) => {
  const url = `${GEOCODING_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const data = await fetchJson(url);

  if (!data.results?.length) {
    throw new Error(`No city found for "${city}". Check the spelling and try again.`);
  }
  const { name, country, admin1, latitude, longitude } = data.results[0];
  return { name, country, region: admin1, latitude, longitude };
};

const getWeather = async ({ latitude, longitude }) => {
  const params = new URLSearchParams({
    latitude,
    longitude,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    timezone: "auto",
    forecast_days: 6,
  });
  return fetchJson(`${FORECAST_URL}?${params}`);
};

// ---- Rendering ----
const render = () => {
  const { place, weather } = state;
  if (!place || !weather) return;

  const { current, daily } = weather;
  const [description, icon] = describe(current.weather_code);

  // Next 5 days (skip today at index 0)
  const forecastHtml = daily.time
    .slice(1, 6)
    .map((date, i) => {
      const idx = i + 1;
      const [, dayIcon] = describe(daily.weather_code[idx]);
      const day = new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" });
      return `
        <div class="forecast-day">
          <div class="day">${day}</div>
          <div class="f-icon">${dayIcon}</div>
          <div class="range">${formatTemp(daily.temperature_2m_max[idx])} / ${formatTemp(daily.temperature_2m_min[idx])}</div>
        </div>`;
    })
    .join("");

  const subtitle = [place.region, place.country].filter(Boolean).join(", ");

  result.innerHTML = `
    <article class="weather-card">
      <div class="weather-main">
        <div>
          <div class="city">${escapeHtml(place.name)}</div>
          <div class="country">${escapeHtml(subtitle)}</div>
          <div class="desc">${description}</div>
        </div>
        <div class="weather-temp">
          <span class="icon" aria-hidden="true">${icon}</span>
          <span class="temp">${formatTemp(current.temperature_2m)}</span>
        </div>
      </div>

      <div class="details-grid">
        <div class="detail"><div class="label">Feels like</div><div class="value">${formatTemp(current.apparent_temperature)}</div></div>
        <div class="detail"><div class="label">Humidity</div><div class="value">${current.relative_humidity_2m}%</div></div>
        <div class="detail"><div class="label">Wind speed</div><div class="value">${formatWind(current.wind_speed_10m)}</div></div>
      </div>

      <div class="forecast">
        <h3>5-day forecast</h3>
        <div class="forecast-grid">${forecastHtml}</div>
      </div>

      <div class="unit-toggle">
        <button type="button" class="secondary" id="unit-btn">Switch to °${state.unit === "C" ? "F" : "C"}</button>
      </div>
    </article>`;

  $("#unit-btn").addEventListener("click", () => {
    state.unit = state.unit === "C" ? "F" : "C";
    try { localStorage.setItem("weather-unit", state.unit); } catch { /* ignore */ }
    render();
  });
};

// ---- Main flow ----
const searchCity = async (city) => {
  button.disabled = true;
  showLoading(result);

  try {
    const place = await getCoordinates(city);
    const weather = await getWeather(place);
    state = { ...state, place, weather };
    try { localStorage.setItem("weather-last-city", city); } catch { /* ignore */ }
    render();
  } catch (error) {
    showMessage(result, error.message, "error");
  } finally {
    button.disabled = false;
  }
};

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const city = input.value.trim();
  if (!city) {
    showMessage(result, "Please enter a city name.", "error");
    return;
  }
  searchCity(city);
});

// Restore preferences / last search
try {
  state.unit = localStorage.getItem("weather-unit") === "F" ? "F" : "C";
  const last = localStorage.getItem("weather-last-city");
  if (last) {
    input.value = last;
    searchCity(last);
  }
} catch { /* storage unavailable */ }
