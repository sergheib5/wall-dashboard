const APP_CONFIG=window.DASHBOARD_CONFIG||{};
const CALENDAR_EMBED_URL=APP_CONFIG.calendarEmbedUrl||"";
const PHOTO_ROTATION_MS=Math.max(30000,Number(APP_CONFIG.photoRotationMs)||240000);
const QUOTE_ROTATION_MS=60000;

function buildCalendarEmbedUrl(mode){
  if(!CALENDAR_EMBED_URL)return "";
  try{
    const url=new URL(CALENDAR_EMBED_URL,window.location.href);
    url.searchParams.set("mode",mode);
    url.searchParams.set("bgcolor","#0d1117");
    url.searchParams.set("showTabs","0");
    url.searchParams.set("showCalendars","0");
    url.searchParams.set("showTz","0");
    url.searchParams.set("showPrint","0");
    url.searchParams.set("showTitle","0");
    if(mode==="AGENDA")url.searchParams.set("showNav","0");
    return url.toString();
  }catch(error){
    console.warn("Calendar embed URL is invalid",error);
    return CALENDAR_EMBED_URL;
  }
}

const viewIds=["todayView","calendarSlide","weatherSlide","photosSlide"];
function showView(viewId){
  if(!viewIds.includes(viewId))return;
  document.querySelectorAll(".view").forEach(view=>view.classList.toggle("active",view.id===viewId));
  const detailNav=document.querySelector(".detail-nav");
  if(detailNav)detailNav.hidden=viewId==="todayView";
  document.querySelectorAll(".nav-item").forEach(button=>{
    const isCurrent=button.dataset.view===viewId;
    button.classList.toggle("active",isCurrent);
    if(isCurrent)button.setAttribute("aria-current","page");
    else button.removeAttribute("aria-current");
  });
  if(viewId==="photosSlide"&&typeof loadPhoto==="function")loadPhoto();
  if(viewId==="weatherSlide"&&typeof loadWeather==="function")loadWeather();
}

document.addEventListener("DOMContentLoaded",()=>{
  document.querySelectorAll(".nav-item").forEach(button=>button.addEventListener("click",()=>showView(button.dataset.view)));

  const agendaFrame=document.getElementById("agendaFrame");
  const calendarFrame=document.getElementById("calendarFrame");
  if(agendaFrame)agendaFrame.src=buildCalendarEmbedUrl("AGENDA");
  if(calendarFrame)calendarFrame.src=buildCalendarEmbedUrl("WEEK");

  const photoToggle=document.getElementById("photoToggle");
  if(photoToggle){
    photoToggle.addEventListener("click",()=>{
      const wasPlaying=photoToggle.getAttribute("aria-pressed")==="true";
      window.togglePhotoRotation?.(!wasPlaying);
      photoToggle.setAttribute("aria-pressed",String(!wasPlaying));
      photoToggle.setAttribute("aria-label",wasPlaying?"Resume automatic photo changes":"Pause automatic photo changes");
      photoToggle.innerHTML=`<span class="material-symbols-outlined" aria-hidden="true">${wasPlaying?"play_arrow":"pause"}</span>`;
    });
  }

  if(typeof initPhotos==="function"){
    initPhotos().then(()=>{
      loadPhoto();
      window.startPhotoRotation?.(PHOTO_ROTATION_MS);
    });
  }
  if(typeof loadWeather==="function")loadWeather();
  if(typeof loadQuote==="function"){
    loadQuote();
    window.setInterval(loadQuote,QUOTE_ROTATION_MS);
  }
});

document.addEventListener("keydown",event=>{
  if(event.key==="Escape")showView("todayView");
});

window.addEventListener("pageshow",event=>{
  if(event.persisted&&typeof loadWeather==="function")loadWeather();
});
