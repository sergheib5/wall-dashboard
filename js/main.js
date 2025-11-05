// CONFIG
const STOCKS_CSV="https://docs.google.com/spreadsheets/d/e/2PACX-1vSgZpS602vubcDBZttiflnjNHTavsQ_l1_epvqL7Vuc39rhciIXdcltL4pnJVSzUnZE8Wc6_2uNHsDL/pub?gid=0&single=true&output=csv";
const TODO_DOC="https://docs.google.com/document/d/e/2PACX-1vQ3c5d6aalilb8iHsKSVXs6GDRo2UULnQoQWUBiiGZeoym3oDXmCYz-_AKJJ19UIwXex-3Cqv7QjHoE/pub";
const WEATHER_LOC="Chicago,US";
const SLIDE_DURATION=60000; // milliseconds (60 seconds default)
const FINNHUB_API_KEY=""; // Optional: Add your free Finnhub API key at https://finnhub.io (free tier: 60 calls/minute)

// SLIDES
let slides=Array.from(document.querySelectorAll(".slide")).filter(s=>s.id!=="marketsSlide");
let cur=0;
let slideInterval=null;

function showSlide(index){
  // Cache slides to avoid repeated DOM queries
  if(!slides||slides.length===0){
    slides=Array.from(document.querySelectorAll(".slide")).filter(s=>s.id!=="marketsSlide");
  }
  if(index<0||index>=slides.length)return;
  if(slides[cur])slides[cur].classList.remove("active");
  cur=index;
  if(slides[cur])slides[cur].classList.add("active");
  updateNavIndicators();
  // Handle slide-specific actions
  const currentSlide=slides[cur];
  if(currentSlide?.id==="photosSlide"){
    if(typeof loadPhoto==="function")loadPhoto();
  }
  if(currentSlide?.id==="quotesSlide"){
    if(typeof loadQuote==="function")loadQuote();
  }
}

function nextSlide(resetTimer=false){
  showSlide((cur+1)%slides.length);
  if(resetTimer)startAutoRotation(); // Reset timer on manual navigation only
}

function prevSlide(resetTimer=false){
  showSlide((cur-1+slides.length)%slides.length);
  if(resetTimer)startAutoRotation(); // Reset timer on manual navigation only
}

function startAutoRotation(){
  if(slideInterval)clearInterval(slideInterval);
  slideInterval=setInterval(()=>nextSlide(false),SLIDE_DURATION);
}

// Store existing listeners to prevent memory leaks
let navDotListeners = [];

function updateNavIndicators(){
  const indicators=document.getElementById("navIndicators");
  if(!indicators)return;
  
  // Remove old listeners to prevent memory leaks
  navDotListeners.forEach(({element,handler})=>{
    element.removeEventListener("click",handler);
  });
  navDotListeners = [];
  
  indicators.innerHTML=Array.from(slides).map((_,i)=>
    `<button class="nav-dot ${i===cur?"active":""}" data-slide="${i}" aria-label="Go to slide ${i+1}"></button>`
  ).join("");
  
  // Add click handlers to dots with proper cleanup tracking
  indicators.querySelectorAll(".nav-dot").forEach((dot,i)=>{
    const handler=()=>{
      showSlide(i);
      startAutoRotation(); // Reset timer when clicking indicator
    };
    dot.addEventListener("click",handler);
    navDotListeners.push({element:dot,handler});
  });
}

// Manual navigation
document.addEventListener("DOMContentLoaded",()=>{
  const prevBtn=document.getElementById("prevBtn");
  const nextBtn=document.getElementById("nextBtn");
  if(prevBtn)prevBtn.addEventListener("click",()=>prevSlide(true));
  if(nextBtn)nextBtn.addEventListener("click",()=>nextSlide(true));
  
  // Touch/swipe support with debouncing
  let touchStartX=0;
  let touchEndX=0;
  let lastSwipeTime=0;
  const SWIPE_THRESHOLD=50;
  const SWIPE_DEBOUNCE=300; // ms
  
  document.addEventListener("touchstart",e=>{
    touchStartX=e.changedTouches[0].screenX;
  });
  document.addEventListener("touchend",e=>{
    const now=Date.now();
    if(now-lastSwipeTime<SWIPE_DEBOUNCE)return; // Debounce
    touchEndX=e.changedTouches[0].screenX;
    const diff=touchStartX-touchEndX;
    if(Math.abs(diff)>SWIPE_THRESHOLD){
      lastSwipeTime=now;
      if(diff>0)nextSlide(true);else prevSlide(true);
    }
  });
  
  // Keyboard navigation
  document.addEventListener("keydown",e=>{
    if(e.key==="ArrowLeft")prevSlide(true);
    if(e.key==="ArrowRight")nextSlide(true);
  });
  
  updateNavIndicators();
  startAutoRotation();
});

// CLOCK - Optimized update
let clockElement = null;
function updateClock(){
  if(!clockElement)clockElement=document.getElementById("clock");
  if(clockElement)clockElement.textContent=new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
}
setInterval(updateClock,1000);
updateClock(); // Initial update

// PROXY FETCH with timeout and better error handling
async function fetchRaw(url, timeout=10000){
  if(!url)return null;
  const proxies=["https://api.allorigins.win/get?url=","https://corsproxy.io/?"];
  for(const p of proxies){
    try{
      const controller=new AbortController();
      const timeoutId=setTimeout(()=>controller.abort(),timeout);
      const r=await fetch(p+encodeURIComponent(url),{signal:controller.signal});
      clearTimeout(timeoutId);
      if(!r.ok)continue;
      const ct=r.headers.get("content-type")||"";
      if(ct.includes("application/json")){
        const j=await r.json();
        if(j&&j.contents)return j.contents;
      }
      return await r.text();
    }catch(err){
      if(err.name==="AbortError")console.warn("Fetch timeout for",url);
      continue;
    }
  }
  return null;
}
async function fetchJSON(url){
  for(let i=0;i<2;i++){ // retry twice
    try{
      const t=await fetchRaw(url);
      if(!t) continue;
      return JSON.parse(t);
    }catch{}
  }
  return null;
}

// INIT
loadTodos();loadMarkets();loadWeather();
// Wait for photos to load, then show first photo if photos slide is initially active
(async()=>{
  if(typeof initPhotos==="function")await initPhotos();
  const photosSlide=document.getElementById("photosSlide");
  if(photosSlide&&photosSlide.classList.contains("active")){
    if(typeof loadPhoto==="function")loadPhoto();
  }
})();
// Load quote if quotes slide is initially active
const quotesSlide=document.getElementById("quotesSlide");
if(quotesSlide&&quotesSlide.classList.contains("active")){
  if(typeof loadQuote==="function")loadQuote();
}
setInterval(loadTodos,120000);
setInterval(loadMarkets,120000);
setInterval(loadWeather,600000);
// Photo rotation is now handled by slide rotation, no separate interval needed

