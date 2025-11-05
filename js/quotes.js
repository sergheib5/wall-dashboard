// QUOTES – fetch daily quotes from API
let cachedQuote = null;
let cacheDate = null;

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
    const response = await fetch("https://api.quotable.io/random?tags=inspirational|motivational|success|wisdom");
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
  container.innerHTML = `
    <div class="quote-text">${quote.text}</div>
    ${quote.author ? `<div class="quote-author">– ${quote.author}</div>` : ""}
  `;
}

// Initialize on load
loadQuote();

