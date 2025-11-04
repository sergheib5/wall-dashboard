// CONFIG
const STOCKS_CSV="https://docs.google.com/spreadsheets/d/e/2PACX-1vSgZpS602vubcDBZttiflnjNHTavsQ_l1_epvqL7Vuc39rhciIXdcltL4pnJVSzUnZE8Wc6_2uNHsDL/pub?gid=0&single=true&output=csv";
const TODO_DOC="https://docs.google.com/document/d/e/2PACX-1vQ3c5d6aalilb8iHsKSVXs6GDRo2UULnQoQWUBiiGZeoym3oDXmCYz-_AKJJ19UIwXex-3Cqv7QjHoE/pub";
const WEATHER_LOC="Chicago,US";

// SLIDES
const slides=document.querySelectorAll(".slide");
let cur=0;
setInterval(()=>{
  slides[cur].classList.remove("active");
  cur=(cur+1)%slides.length;
  slides[cur].classList.add("active");
  // If photos slide is now active, load the next photo
  if(slides[cur].id==="photosSlide"){
    loadPhoto();
  }
},6000);

// CLOCK
setInterval(()=>{const el=document.getElementById("clock");if(el)el.textContent=new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});},1000);

// PROXY FETCH
async function fetchRaw(url){
  const proxies=["https://api.allorigins.win/get?url=","https://corsproxy.io/?"];
  for(const p of proxies){
    try{
      const r=await fetch(p+encodeURIComponent(url));
      if(!r.ok) continue;
      const ct=r.headers.get("content-type")||"";
      if(ct.includes("application/json")){
        const j=await r.json(); if(j && j.contents) return j.contents;
      }
      return await r.text();
    }catch{}
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
// Wait for photos to load, then show first photo if photos slide is active
(async()=>{
  await initPhotos();
  const photosSlide=document.getElementById("photosSlide");
  if(photosSlide&&photosSlide.classList.contains("active")){
    loadPhoto();
  }
})();
setInterval(loadTodos,120000);
setInterval(loadMarkets,120000);
setInterval(loadWeather,600000);
// Photo rotation is now handled by slide rotation, no separate interval needed

