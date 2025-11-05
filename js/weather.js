// WEATHER – use Open-Meteo for reliable current + 3-day forecast
// Map weather codes to emoji (WMO Weather Interpretation Codes)
function getWeatherIcon(code){
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

async function loadWeather(){
  const c=document.getElementById("weatherContainer");
  if(!c)return;
  
  try{
    const url=`https://api.open-meteo.com/v1/forecast?latitude=41.8781&longitude=-87.6298&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=America%2FChicago`;
    const res=await fetch(url);
    if(!res.ok){
      c.innerHTML="<div class='loading'>No weather data</div>";
      return;
    }
    const data=await res.json();

    // Validate response structure
    if(!data.current_weather||!data.daily){
      c.innerHTML="<div class='loading'>Invalid weather data</div>";
      return;
    }

    // current conditions
    const current=data.current_weather;
    const days=data.daily.time;
    const minT=data.daily.temperature_2m_min;
    const maxT=data.daily.temperature_2m_max;
    const codes=data.daily.weathercode;

    // Get today's date in Chicago timezone (YYYY-MM-DD format)
    const now=new Date();
    const formatter=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Chicago"}); // en-CA gives YYYY-MM-DD format
    const todayStr=formatter.format(now);
    
    // Find the first date that is today or later (filter out past dates)
    let todayIndex=-1;
    for(let i=0;i<days.length;i++){
      // Compare dates as strings (YYYY-MM-DD format is lexicographically sortable)
      if(days[i]>=todayStr){
        todayIndex=i;
        break;
      }
    }
    
    // If today not found, start from the first available date
    if(todayIndex===-1)todayIndex=0;

    // build forecast: today's min/max and next 3 days
    let fHTML="";
    
    // Today's forecast card - show "Today" instead of day name
    const todayCode=codes[todayIndex]??0;
    const todayMin=Math.round(minT[todayIndex]??0);
    const todayMax=Math.round(maxT[todayIndex]??0);
    fHTML+=`
      <div class='forecast-card'>
        <div class='date'>Today</div>
        <div class='icon'>${getWeatherIcon(todayCode)}</div>
        <div class='temp'>${todayMin}° / ${todayMax}°</div>
      </div>`;
    
    // Next 2 days forecast (starting from todayIndex+1)
    for(let i=todayIndex+1;i<=todayIndex+2 && i<days.length;i++){
      const date=new Date(days[i]+"T12:00:00"); // Add time to avoid timezone shifts
      const label=date.toLocaleDateString("en-US",{weekday:"short",timeZone:"America/Chicago"});
      const code=codes[i]??0;
      const min=Math.round(minT[i]??0);
      const max=Math.round(maxT[i]??0);
      fHTML+=`
        <div class='forecast-card'>
          <div class='date'>${label}</div>
          <div class='icon'>${getWeatherIcon(code)}</div>
          <div class='temp'>${min}° / ${max}°</div>
        </div>`;
    }

    const currentCode=current.weathercode??0;
    const currentTemp=Math.round(current.temperature??0);
    const currentWind=Math.round(current.windspeed??0);
    
    c.innerHTML=`
      <div class='weather-main'>
        <div class='weather-icon'>${getWeatherIcon(currentCode)}</div>
        <div class='weather-temp'>${currentTemp}°</div>
      </div>
      <div class='weather-desc'>${currentWind} km/h wind</div>
      <div class='weather-location'>Chicago</div>
      <div class='weather-forecast'>${fHTML}</div>`;
  }catch(err){
    console.error(err);
    c.innerHTML="<div class='loading'>Weather unavailable</div>";
  }
}

