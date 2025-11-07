// QUOTES – fetch quotes from API (new quote each time slide is shown)
let quoteIndex = 0;

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

// HTML sanitization helper
function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function loadQuote() {
  const timestamp = Date.now();
  console.log(`🔄 loadQuote() called at ${new Date().toISOString()} (timestamp: ${timestamp})`);
  
  const container = document.getElementById("quotesContainer");
  if (!container) {
    console.warn("⚠️ Quotes container not found");
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
      console.log(`📡 Trying ${api.name}: ${api.url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn(`⏱️ ${api.name} timeout after 5 seconds`);
        controller.abort();
      }, 5000);
      
      const fetchStart = Date.now();
      const response = await fetch(api.url, {
        signal: controller.signal,
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      clearTimeout(timeoutId);
      
      const fetchDuration = Date.now() - fetchStart;
      console.log(`📥 ${api.name} response in ${fetchDuration}ms - Status: ${response.status}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`📦 ${api.name} raw response:`, data);
      
      const quote = api.parser(data);
      
      if (!quote || !quote.text) {
        throw new Error("Invalid quote data received");
      }
      
      console.log(`✅ Successfully loaded quote from ${api.name}:`, quote);
      displayQuote(quote, container);
      return; // Success, exit function
      
    } catch (err) {
      console.warn(`⚠️ ${api.name} failed:`, err.message);
      // Continue to next API
      continue;
    }
  }
  
  // If all APIs failed, use local quotes array (rotates like photos)
  console.warn("⚠️ All quote APIs failed, using local quotes");
  const currentIndex = quoteIndex;
  const localQuote = localQuotes[currentIndex];
  quoteIndex = (quoteIndex + 1) % localQuotes.length;
  console.log(`📚 Using local quote ${currentIndex + 1}/${localQuotes.length}:`, localQuote);
  displayQuote(localQuote, container);
}

function displayQuote(quote, container) {
  if (!container) {
    console.warn("⚠️ displayQuote: container not found");
    return;
  }
  console.log("🎨 displayQuote called with:", quote);
  const text = escapeHtml(quote.text || '');
  const author = quote.author ? escapeHtml(quote.author) : '';
  const html = `
    <div class="quote-text">${text}</div>
    ${author ? `<div class="quote-author">${author}</div>` : ""}
  `;
  console.log("📝 Setting innerHTML to:", html.substring(0, 100) + "...");
  container.innerHTML = html;
  console.log("✅ Quote displayed");
}

// Initialize on load
loadQuote();

