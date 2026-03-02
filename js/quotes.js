// QUOTES – fetch quotes from API (new quote each time slide is shown)
const LOCAL_QUOTE_STATE_KEY = "wallDashboardLocalQuoteState";
const LAST_QUOTE_SIGNATURE_KEY = "wallDashboardLastQuoteSignature";
const LAST_GOOD_QUOTE_CACHE_KEY = "wallDashboardLastGoodQuote";

// Local quotes array as fallback (rotates like photos)
const localQuotes = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
  { text: "Life is what happens to you while you're busy making other plans.", author: "John Lennon" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle" },
  { text: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "Don't let yesterday take up too much of today.", author: "Will Rogers" },
  { text: "You learn more from failure than from success.", author: "Unknown" },
  { text: "If you are working on something exciting that you really care about, you don't have to be pushed. The vision pulls you.", author: "Steve Jobs" },
  { text: "People who are crazy enough to think they can change the world, are the ones who do.", author: "Rob Siltanen" },
  { text: "We may encounter many defeats but we must not be defeated.", author: "Maya Angelou" },
  { text: "The only person you are destined to become is the person you decide to be.", author: "Ralph Waldo Emerson" },
  { text: "Go confidently in the direction of your dreams. Live the life you have imagined.", author: "Henry David Thoreau" },
  { text: "The two most important days in your life are the day you are born and the day you find out why.", author: "Mark Twain" },
  { text: "Whether you think you can or you think you can't, you're right.", author: "Henry Ford" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "Your limitation—it's only your imagination.", author: "Unknown" },
  { text: "Great things never come from comfort zones.", author: "Unknown" }
];

function getLocalDayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandom(seed) {
  let state = seed || 1;
  return function seededRandom() {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createDailyQuoteOrder(dayKey) {
  const order = localQuotes.map((_, index) => index);
  const random = createSeededRandom(hashString(dayKey));

  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  return order;
}

function readStoredLocalQuoteState() {
  try {
    const rawState = localStorage.getItem(LOCAL_QUOTE_STATE_KEY);
    if (!rawState) return null;
    return JSON.parse(rawState);
  } catch (err) {
    console.warn("Failed to read stored local quote state:", err.message);
    return null;
  }
}

function writeStoredLocalQuoteState(state) {
  try {
    localStorage.setItem(LOCAL_QUOTE_STATE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("Failed to store local quote state:", err.message);
  }
}

function getLocalQuoteState() {
  const dayKey = getLocalDayKey();
  const storedState = readStoredLocalQuoteState();
  const hasValidStoredState = Boolean(
    storedState &&
    Array.isArray(storedState.order) &&
    storedState.order.length === localQuotes.length &&
    Number.isInteger(storedState.nextPosition) &&
    storedState.nextPosition >= 0 &&
    storedState.nextPosition < localQuotes.length &&
    storedState.dayKey === dayKey
  );

  if (hasValidStoredState) {
    return storedState;
  }

  const order = createDailyQuoteOrder(dayKey);

  if (
    storedState &&
    Array.isArray(storedState.order) &&
    storedState.order.length === localQuotes.length &&
    localQuotes.length > 1 &&
    storedState.dayKey !== dayKey &&
    storedState.order[0] === order[0]
  ) {
    order.push(order.shift());
  }

  const freshState = {
    dayKey,
    order,
    nextPosition: 0
  };

  writeStoredLocalQuoteState(freshState);
  return freshState;
}

function getNextLocalQuote() {
  const state = getLocalQuoteState();
  const quoteIndex = state.order[state.nextPosition];
  const quote = localQuotes[quoteIndex];
  const nextPosition = (state.nextPosition + 1) % localQuotes.length;

  writeStoredLocalQuoteState({
    ...state,
    nextPosition
  });

  return {
    quote,
    quoteIndex,
    sequencePosition: state.nextPosition
  };
}

function getQuoteSignature(quote) {
  if (!quote || !quote.text) return '';
  return `${quote.text}::${quote.author || ''}`;
}

function readLastQuoteSignature() {
  try {
    return localStorage.getItem(LAST_QUOTE_SIGNATURE_KEY) || '';
  } catch (err) {
    console.warn("Failed to read last quote signature:", err.message);
    return '';
  }
}

function writeLastQuoteSignature(quote) {
  const signature = getQuoteSignature(quote);
  if (!signature) return;

  try {
    localStorage.setItem(LAST_QUOTE_SIGNATURE_KEY, signature);
  } catch (err) {
    console.warn("Failed to store last quote signature:", err.message);
  }
}

function readCachedQuote() {
  try {
    const rawQuote = localStorage.getItem(LAST_GOOD_QUOTE_CACHE_KEY);
    if (!rawQuote) return null;
    const quote = JSON.parse(rawQuote);
    if (!quote || typeof quote.text !== "string") return null;
    return quote;
  } catch (err) {
    console.warn("Failed to read cached quote:", err.message);
    return null;
  }
}

function writeCachedQuote(quote) {
  if (!quote || typeof quote.text !== "string") return;

  try {
    localStorage.setItem(LAST_GOOD_QUOTE_CACHE_KEY, JSON.stringify(quote));
  } catch (err) {
    console.warn("Failed to cache quote:", err.message);
  }
}

// HTML sanitization helper
function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function loadQuote() {
  const timestamp = Date.now();
  const lastQuoteSignature = readLastQuoteSignature();
  
  const container = document.getElementById("quotesContainer");
  if (!container) {
    console.warn("Quotes container not found");
    return;
  }

  // Show loading state
  container.innerHTML = "<div class='loading'>Loading quote...</div>";

  // Try multiple quote APIs as fallbacks
  const quoteApis = [
    {
      name: 'quotable.io (simple)',
      url: `https://api.quotable.io/random?_t=${timestamp}`,
      parser: (data) => ({ text: data.content, author: data.author })
    },
    {
      name: 'quotable.io (with tags)',
      url: `https://api.quotable.io/random?tags=inspirational,motivational,success,wisdom&_t=${timestamp}`,
      parser: (data) => ({ text: data.content, author: data.author })
    },
    {
      name: 'zenquotes.io',
      url: `https://zenquotes.io/api/random?_t=${timestamp}`,
      parser: (data) => ({ text: data[0]?.q, author: data[0]?.a })
    }
  ];

  for (const api of quoteApis) {
    try {
      let data;
      if (typeof fetchRaw === "function") {
        const raw = await fetchRaw(api.url, 5000);
        if (!raw) {
          throw new Error("Failed to fetch");
        }
        data = JSON.parse(raw);
      } else {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, 5000);

        const response = await fetch(api.url, {
          signal: controller.signal,
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }

        data = await response.json();
      }
      
      const quote = api.parser(data);
      
      if (!quote || !quote.text) {
        throw new Error("Invalid quote data received");
      }

      if (getQuoteSignature(quote) === lastQuoteSignature) {
        continue;
      }
      
      displayQuote(quote, container);
      return; // Success, exit function
      
    } catch (err) {
      console.warn(`${api.name} failed:`, err.message);
      // Continue to next API
      continue;
    }
  }

  const cachedQuote = readCachedQuote();
  if (cachedQuote && getQuoteSignature(cachedQuote) !== lastQuoteSignature) {
    displayQuote(cachedQuote, container);
    return;
  }

  // If all APIs failed, use the local quotes array in a daily shuffled order.
  const localQuoteState = getNextLocalQuote();
  displayQuote(localQuoteState.quote, container);
}

function displayQuote(quote, container) {
  if (!container) {
    console.warn("displayQuote: container not found");
    return;
  }
  const text = escapeHtml(quote.text || '');
  const author = quote.author ? escapeHtml(quote.author) : '';
  const html = `
    <div class="quote-text">${text}</div>
    ${author ? `<div class="quote-author">${author}</div>` : ""}
  `;
  container.innerHTML = html;
  writeLastQuoteSignature(quote);
  writeCachedQuote(quote);
}
