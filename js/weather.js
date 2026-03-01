// WEATHER – use Open-Meteo for reliable current + 3-day forecast
// Map weather codes to emoji (WMO Weather Interpretation Codes)
const WEATHER_LOCATION_CACHE_PREFIX="wall-dashboard-weather-location:";
const WEATHER_LOCATION_CACHE_TTL=1000*60*60*24*7; // 7 days
let resolvedWeatherLocation=null;
let weatherLocationPromise=null;

function getWeatherConfig(){
  if(typeof WEATHER_CONFIG!=="undefined"){
    return WEATHER_CONFIG;
  }
  return {
    query:"Chicago",
    countryCode:"US",
    label:"Chicago",
    units:{
      temperature:"celsius",
      windSpeed:"mph"
    }
  };
}

function getWeatherUnits(config){
  const requested=config.units||{};
  const temperature=requested.temperature==="celsius"?"celsius":"fahrenheit";
  const windSpeed=requested.windSpeed==="kmh"?"kmh":"mph";
  return {
    temperature,
    windSpeed,
    windLabel:windSpeed==="kmh"?"km/h":"mph"
  };
}

function getWeatherLocationCacheKey(config){
  return `${WEATHER_LOCATION_CACHE_PREFIX}${config.query||""}:${config.countryCode||""}`;
}

function readCachedWeatherLocation(config){
  try{
    const raw=localStorage.getItem(getWeatherLocationCacheKey(config));
    if(!raw)return null;
    const parsed=JSON.parse(raw);
    if(
      !parsed||
      typeof parsed.latitude!=="number"||
      typeof parsed.longitude!=="number"||
      !parsed.timeZone
    ){
      return null;
    }
    if(typeof parsed.cachedAt!=="number"){
      return null;
    }
    return {
      location:{
        label:parsed.label||config.label||config.query||"Weather",
        latitude:parsed.latitude,
        longitude:parsed.longitude,
        timeZone:parsed.timeZone
      },
      isFresh:Date.now()-parsed.cachedAt<WEATHER_LOCATION_CACHE_TTL
    };
  }catch(err){
    console.warn("Unable to read cached weather location",err);
    return null;
  }
}

function cacheWeatherLocation(config, location){
  try{
    localStorage.setItem(
      getWeatherLocationCacheKey(config),
      JSON.stringify({
        label:location.label,
        latitude:location.latitude,
        longitude:location.longitude,
        timeZone:location.timeZone,
        cachedAt:Date.now()
      })
    );
  }catch(err){
    console.warn("Unable to cache weather location",err);
  }
}

async function fetchWeatherLocation(config){
  const params=new URLSearchParams({
    name:config.query||config.label||"Chicago",
    count:"1",
    language:"en",
    format:"json"
  });
  if(config.countryCode){
    params.set("countryCode",config.countryCode);
  }

  const response=await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`,{
    cache:"no-store"
  });
  if(!response.ok){
    throw new Error(`Geocoding lookup failed with status ${response.status}`);
  }

  const data=await response.json();
  const match=data?.results?.[0];
  if(!match){
    throw new Error("No matching weather location found");
  }

  return {
    label:config.label||match.name||config.query||"Weather",
    latitude:match.latitude,
    longitude:match.longitude,
    timeZone:match.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}

async function resolveWeatherLocation(){
  const config=getWeatherConfig();
  if(resolvedWeatherLocation)return resolvedWeatherLocation;
  if(weatherLocationPromise)return weatherLocationPromise;

  const cached=readCachedWeatherLocation(config);
  if(cached?.isFresh){
    resolvedWeatherLocation=cached.location;
    return resolvedWeatherLocation;
  }

  weatherLocationPromise=(async()=>{
    try{
      const location=await fetchWeatherLocation(config);
      cacheWeatherLocation(config,location);
      resolvedWeatherLocation=location;
      return location;
    }catch(err){
      if(cached?.location){
        console.warn("Using cached weather location after geocoding failure",err);
        resolvedWeatherLocation=cached.location;
        return cached.location;
      }
      throw err;
    }
  })();

  try{
    return await weatherLocationPromise;
  }finally{
    weatherLocationPromise=null;
  }
}

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
    const config=getWeatherConfig();
    const location=await resolveWeatherLocation();
    const units=getWeatherUnits(config);
    window.dashboardTimeZone=location.timeZone;
    const url=`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(location.latitude)}&longitude=${encodeURIComponent(location.longitude)}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=${encodeURIComponent(location.timeZone)}&temperature_unit=${encodeURIComponent(units.temperature)}&wind_speed_unit=${encodeURIComponent(units.windSpeed)}`;
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

    // Get today's date in the resolved timezone (YYYY-MM-DD format)
    const now=new Date();
    const formatter=new Intl.DateTimeFormat("en-CA",{timeZone:location.timeZone}); // en-CA gives YYYY-MM-DD format
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
      const label=date.toLocaleDateString("en-US",{weekday:"short",timeZone:location.timeZone});
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
      <div class='weather-desc'>${currentWind} ${units.windLabel} wind</div>
      <div class='weather-location'>${location.label}</div>
      <div class='weather-forecast'>${fHTML}</div>`;
  }catch(err){
    console.error(err);
    c.innerHTML="<div class='loading'>Weather unavailable</div>";
  }
}
