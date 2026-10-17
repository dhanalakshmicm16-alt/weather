import { $, escapeHtml, fetchJson, showLoading, showMessage } from "./utils.js";
import { OMDB_API_KEY } from "./config.js";

const API_URL = "https://www.omdbapi.com/";

// ---- DOM references ----
const form = $("#search-form");
const input = $("#movie-input");
const button = $("#search-btn");
const status = $("#status");
const grid = $("#movie-grid");
const loadMore = $("#load-more");
const loadMoreBtn = $("#load-more-btn");
const keyBox = $("#key-box");
const keyForm = $("#key-form");
const keyInput = $("#key-input");
const modalRoot = $("#modal-root");

// ---- State ----
let apiKey = OMDB_API_KEY;
const search = { query: "", page: 1, total: 0, shown: 0 };

try { apiKey = apiKey || localStorage.getItem("omdb-key") || ""; } catch { /* ignore */ }

// ---- API ----
const buildUrl = (params) => `${API_URL}?${new URLSearchParams({ apikey: apiKey, ...params })}`;

const searchMovies = async (query, page) => {
  const data = await fetchJson(buildUrl({ s: query, type: "movie", page }));

  if (data.Response === "False") {
    const { Error: message = "Something went wrong." } = data;
    if (/invalid api key/i.test(message)) {
      throw new Error("Invalid OMDb API key. Please check your key and try again.");
    }
    if (/limit/i.test(message)) {
      throw new Error("Daily API request limit reached. Try again tomorrow or use another key.");
    }
    if (/too many results/i.test(message)) {
      throw new Error("Too many results. Please type a longer, more specific title.");
    }
    if (/not found/i.test(message)) {
      throw new Error(`No movies found for "${query}". Try a different title.`);
    }
    throw new Error(message);
  }

  const { Search: movies, totalResults } = data;
  return { movies, total: Number(totalResults) };
};

const getDetails = (imdbID) => fetchJson(buildUrl({ i: imdbID, plot: "short" }));

// ---- Helpers ----
const isValid = (value) => value && value !== "N/A";
const posterHtml = (poster, title) =>
  isValid(poster)
    ? `<img class="poster" src="${escapeHtml(poster)}" alt="Poster of ${escapeHtml(title)}" loading="lazy" />`
    : `<div class="poster placeholder" aria-hidden="true">🎞️</div>`;

// ---- Rendering ----
const cardHtml = ({ Title, Year, Poster, imdbID, imdbRating }) => `
  <button type="button" class="movie-card" data-id="${escapeHtml(imdbID)}">
    ${posterHtml(Poster, Title)}
    <div class="movie-info">
      <h3>${escapeHtml(Title)}</h3>
      <div class="movie-meta">${escapeHtml(Year)}</div>
      <div class="rating">${isValid(imdbRating) ? `⭐ ${escapeHtml(imdbRating)}/10` : "No rating"}</div>
    </div>
  </button>`;

const renderModal = (movie) => {
  const { Title, Year, Rated, Released, Runtime, Genre, Director, Actors, Plot, Poster, imdbRating, imdbVotes } = movie;
  const row = (label, value) => (isValid(value) ? `<p><strong>${label}:</strong> ${escapeHtml(value)}</p>` : "");

  modalRoot.innerHTML = `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="${escapeHtml(Title)} details">
      <div class="modal">
        <button type="button" class="close" aria-label="Close">✕</button>
        <div>${posterHtml(Poster, Title)}</div>
        <div>
          <h2>${escapeHtml(Title)} (${escapeHtml(Year)})</h2>
          <div class="tags">${[Rated, Runtime, Genre].filter(isValid).map(escapeHtml).join(" • ")}</div>
          ${isValid(imdbRating) ? `<p class="rating">⭐ ${escapeHtml(imdbRating)}/10 ${isValid(imdbVotes) ? `(${escapeHtml(imdbVotes)} votes)` : ""}</p>` : ""}
          ${row("Released", Released)}
          ${row("Director", Director)}
          ${row("Cast", Actors)}
          ${row("Plot", Plot)}
        </div>
      </div>
    </div>`;

  const close = () => { modalRoot.innerHTML = ""; document.removeEventListener("keydown", onKey); };
  const onKey = (e) => e.key === "Escape" && close();
  document.addEventListener("keydown", onKey);
  modalRoot.querySelector(".close").addEventListener("click", close);
  modalRoot.querySelector(".modal-backdrop").addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-backdrop")) close();
  });
};

// ---- Main flow ----
const loadPage = async (reset) => {
  if (!apiKey) {
    keyBox.classList.remove("hidden");
    showMessage(status, "Add your OMDb API key above to start searching.", "error");
    return;
  }

  button.disabled = loadMoreBtn.disabled = true;
  if (reset) {
    grid.innerHTML = "";
    loadMore.classList.add("hidden");
    showLoading(status);
  }

  try {
    const { movies, total } = await searchMovies(search.query, search.page);

    // Fetch details (for ratings) for every result in parallel
    const settled = await Promise.allSettled(movies.map(({ imdbID }) => getDetails(imdbID)));
    const enriched = movies.map((movie, i) =>
      settled[i].status === "fulfilled" ? { ...movie, ...settled[i].value } : movie
    );

    grid.insertAdjacentHTML("beforeend", enriched.map(cardHtml).join(""));
    search.total = total;
    search.shown += movies.length;

    status.innerHTML = `<div class="message info">Showing ${search.shown} of ${total} results for “${escapeHtml(search.query)}”</div>`;
    loadMore.classList.toggle("hidden", search.shown >= total);
  } catch (error) {
    if (/invalid api key/i.test(error.message)) keyBox.classList.remove("hidden");
    if (reset) grid.innerHTML = "";
    showMessage(status, error.message, "error");
  } finally {
    button.disabled = loadMoreBtn.disabled = false;
  }
};

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = input.value.trim();

  // Handle invalid search queries
  if (query.length < 2) {
    grid.innerHTML = "";
    loadMore.classList.add("hidden");
    showMessage(status, "Please enter at least 2 characters to search.", "error");
    return;
  }

  Object.assign(search, { query, page: 1, total: 0, shown: 0 });
  loadPage(true);
});

loadMoreBtn.addEventListener("click", () => {
  search.page += 1;
  loadPage(false);
});

// Event delegation: open details when a card is clicked
grid.addEventListener("click", async (event) => {
  const card = event.target.closest(".movie-card");
  if (!card) return;

  try {
    renderModal(await getDetails(card.dataset.id).then((d) => {
      if (d.Response === "False") throw new Error(d.Error);
      return d;
    }));
  } catch (error) {
    showMessage(status, `Could not load movie details: ${error.message}`, "error");
  }
});

keyForm.addEventListener("submit", (event) => {
  event.preventDefault();
  apiKey = keyInput.value.trim();
  try { localStorage.setItem("omdb-key", apiKey); } catch { /* ignore */ }
  keyBox.classList.add("hidden");
  showMessage(status, "Key saved. Search for a movie to begin.", "info");
});

if (!apiKey) keyBox.classList.remove("hidden");
