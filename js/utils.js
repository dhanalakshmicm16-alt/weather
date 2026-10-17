// Shared helpers used by both apps (ES module)

/** Shorthand for document.querySelector */
export const $ = (selector, root = document) => root.querySelector(selector);

/** Escape text before injecting it into innerHTML */
export const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[ch]);

/**
 * Fetch JSON with friendly error handling.
 * Throws an Error with a user-readable message on network / HTTP / parse failure.
 */
export const fetchJson = async (url) => {
  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error("Network error. Please check your internet connection and try again.");
  }

  if (!response.ok) {
    throw new Error(`The server responded with an error (${response.status}). Please try again later.`);
  }

  try {
    return await response.json();
  } catch {
    throw new Error("Received an unexpected response from the server.");
  }
};

/** Render a status message (error / info) into a container */
export const showMessage = (container, text, type = "info") => {
  container.innerHTML = `<div class="message ${type}" role="${type === "error" ? "alert" : "status"}">${escapeHtml(text)}</div>`;
};

/** Render a loading spinner into a container */
export const showLoading = (container) => {
  container.innerHTML = `<div class="spinner" role="status" aria-label="Loading"></div>`;
};
