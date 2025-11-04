// WEATHER – robust current + 3-day forecast
function getIcon(desc){
  const d=(desc||"").toLowerCase();
  if(d.includes("sun")||d.includes("clear"))return"☀️";
  if(d.includes("cloud"))return"☁️";
  if(d.includes("rain"))return"🌧️";
  if(d.includes("storm")||d.includes("thunder"))return"⛈️";
  if(d.includes("snow"))return"❄️";
  if(d.includes("fog")||d.includes("mist"))return"🌫️";
  return"🌤️";
}
function ymdLocal(d){return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
// WEATHER – use Open-Meteo for reliable current + 3-day forecast
async function loadWeather(){
  const c=document.getElementById("weatherContainer");
  try{
    const url=`https://api.open-meteo.com/v1/forecast?latitude=41.8781&longitude=-87.6298&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=America%2FChicago`;
    const res=await fetch(url);
    if(!res.ok){c.innerHTML="<div class='loading'>No weather data</div>";return;}
    const data=await res.json();

    // current conditions
    const current=data.current_weather;
    const todayIndex=0;
    const days=data.daily.time;
    const minT=data.daily.temperature_2m_min;
    const maxT=data.daily.temperature_2m_max;
    const codes=data.daily.weathercode;

    // map weather codes to emoji
    function getIcon(code){
      if([0].includes(code)) return "☀️";
      if([1,2].includes(code)) return "🌤️";
      if([3].includes(code)) return "☁️";
      if([45,48].includes(code)) return "🌫️";
      if([51,53,55,56,57].includes(code)) return "🌦️";
      if([61,63,65,80,81,82].includes(code)) return "🌧️";
      if([66,67,71,73,75,77,85,86].includes(code)) return "❄️";
      if([95,96,99].includes(code)) return "⛈️";
      return "🌤️";
    }

    // build forecast for next 3 days (skip today)
    let fHTML="";
    for(let i=1;i<=3 && i<days.length;i++){
      const date=new Date(days[i]);
      const label=date.toLocaleDateString("en-US",{weekday:"short"});
      fHTML+=`
        <div class='forecast-card'>
          <div class='date'>${label}</div>
          <div class='icon'>${getIcon(codes[i])}</div>
          <div class='temp'>${minT[i]}° / ${maxT[i]}°</div>
        </div>`;
    }

    c.innerHTML=`
      <div class='weather-icon'>${getIcon(current.weathercode)}</div>
      <div class='weather-temp'>${Math.round(current.temperature)}°C</div>
      <div class='weather-desc'>${current.windspeed} km/h wind</div>
      <div style='color:var(--text-dim);margin-top:.5rem'>Chicago</div>
      <div class='weather-forecast'>${fHTML}</div>`;
  }catch(err){
    console.error(err);
    c.innerHTML="<div class='loading'>Weather unavailable</div>";
  }
}

