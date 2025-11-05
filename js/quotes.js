// QUOTES – fetch daily quotes from API
let cachedQuote = null;
let cacheDate = null;

// HTML sanitization helper
function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getDayKey() {
  const today = new Date();
  return `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
}

async function loadQuote() {
  const container = document.getElementById("quotesContainer");
  if (!container) return;

  // Check if we have a cached quote for today
  const todayKey = getDayKey();
  if (cachedQuote && cacheDate === todayKey) {
    displayQuote(cachedQuote, container);
    return;
  }

  // Show loading state
  container.innerHTML = "<div class='loading'>Loading quote...</div>";

  try {
    // Fetch from quotable.io API (free, no API key needed)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    const response = await fetch("https://api.quotable.io/random?tags=inspirational|motivational|success|wisdom", {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) throw new Error("Failed to fetch quote");
    
    const data = await response.json();
    const quote = {
      text: data.content,
      author: data.author
    };

    // Cache the quote for today
    cachedQuote = quote;
    cacheDate = todayKey;
    
    displayQuote(quote, container);
  } catch (err) {
    console.error("Error loading quote:", err);
    // Fallback to a default quote
    const fallback = {
      text: "The only way to do great work is to love what you do.",
      author: "Steve Jobs"
    };
    displayQuote(fallback, container);
  }
}

function displayQuote(quote, container) {
  if (!container) return;
  const text = escapeHtml(quote.text || '');
  const author = quote.author ? escapeHtml(quote.author) : '';
  container.innerHTML = `
    <div class="quote-text">${text}</div>
    ${author ? `<div class="quote-author">${author}</div>` : ""}
  `;
}

// Initialize on load
loadQuote();

