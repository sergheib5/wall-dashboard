// WEATHER – use Open-Meteo for reliable current + 3-day forecast
// Map weather codes to emoji (WMO Weather Interpretation Codes)
const WEATHER_LOCATION_CACHE_PREFIX="wall-dashboard-weather-location:";
const WEATHER_LOCATION_CACHE_TTL=1000*60*60*24*7; // 7 days
const WEATHER_DATA_CACHE_PREFIX="wall-dashboard-weather-data:";
let resolvedWeatherLocation=null;
let weatherLocationPromise=null;

function getWeatherConfig(){
  if(window.DASHBOARD_CONFIG?.weather){
    return window.DASHBOARD_CONFIG.weather;
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

function getWeatherDataCacheKey(config){
  return `${WEATHER_DATA_CACHE_PREFIX}${config.query||""}:${config.countryCode||""}:${config.units?.temperature||""}:${config.units?.windSpeed||""}`;
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

function readCachedWeatherData(config){
  try{
    const raw=localStorage.getItem(getWeatherDataCacheKey(config));
    if(!raw)return null;
    const parsed=JSON.parse(raw);
    if(
      !parsed||
      !parsed.location||
      !Array.isArray(parsed.forecast)||
      !parsed.current||
      typeof parsed.current.temp!=="number"||
      typeof parsed.current.feelsLike!=="number"||
      typeof parsed.current.humidity!=="number"||
      typeof parsed.current.wind!=="number"||
      typeof parsed.current.rainChance!=="number"||
      typeof parsed.current.condition!=="string"||
      parsed.forecast.length===0||
      parsed.forecast.some(day=>
        !day||
        typeof day.label!=="string"||
        typeof day.code!=="number"||
        typeof day.min!=="number"||
        typeof day.max!=="number"||
        typeof day.rainChance!=="number"||
        typeof day.wind!=="number"
      )
    ){
      return null;
    }
    return parsed;
  }catch(err){
    console.warn("Unable to read cached weather",err);
    return null;
  }
}

function writeCachedWeatherData(config, weatherData){
  try{
    localStorage.setItem(getWeatherDataCacheKey(config),JSON.stringify(weatherData));
  }catch(err){
    console.warn("Unable to cache weather",err);
  }
}

function renderWeather(container, weatherData, units){
  if(!container||!weatherData)return;

  window.dashboardTimeZone=weatherData.location.timeZone;

  const forecastHtml=weatherData.forecast.map(day=>`
    <div class='forecast-card'>
      <div class='date'>${day.label}</div>
      <div class='icon'>${getWeatherIcon(day.code)}</div>
      <div class='temp'><span class='temp-high'>${day.max}°</span><span class='temp-divider'>/</span><span class='temp-low'>${day.min}°</span></div>
      <div class='detail'>${day.rainChance}% rain</div>
      <div class='detail'>${day.wind} ${units.windLabel}</div>
    </div>
  `).join("");

  const stats=[
    {label:"Feels like",value:`${weatherData.current.feelsLike}°`},
    {label:"Humidity",value:`${weatherData.current.humidity}%`},
    {label:"Rain",value:`${weatherData.current.rainChance}%`},
    {label:"Wind",value:`${weatherData.current.wind} ${units.windLabel}`}
  ].map(stat=>`
    <div class='weather-stat'>
      <div class='weather-stat-label'>${stat.label}</div>
      <div class='weather-stat-value'>${stat.value}</div>
    </div>
  `).join("");

  container.innerHTML=`
    <div class='weather-hero'>
      <div class='weather-main'>
        <div class='weather-icon'>${getWeatherIcon(weatherData.current.code)}</div>
        <div class='weather-temp-block'>
          <div class='weather-temp'>${weatherData.current.temp}°</div>
          <div class='weather-desc'>${weatherData.current.condition}</div>
        </div>
      </div>
      <div class='weather-location'>${weatherData.location.label}</div>
    </div>
    <div class='weather-stats'>${stats}</div>
    <div class='weather-forecast'>${forecastHtml}</div>`;
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

function getWeatherLabel(code){
  if(code===0) return "Clear";
  if([1,2].includes(code)) return "Partly cloudy";
  if(code===3) return "Cloudy";
  if([45,48].includes(code)) return "Fog";
  if([51,53,55,56,57].includes(code)) return "Drizzle";
  if([61,63,65,80,81,82].includes(code)) return "Rain";
  if([66,67,71,73,75,77,85,86].includes(code)) return "Snow";
  if([95,96,99].includes(code)) return "Storms";
  return "Mild";
}

async function loadWeather(){
  const c=document.getElementById("weatherContainer");
  if(!c)return;
  const config=getWeatherConfig();
  const units=getWeatherUnits(config);
  const cachedWeather=readCachedWeatherData(config);

  try{
    const location=await resolveWeatherLocation();
    const url=`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(location.latitude)}&longitude=${encodeURIComponent(location.longitude)}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,wind_speed_10m_max&timezone=${encodeURIComponent(location.timeZone)}&temperature_unit=${encodeURIComponent(units.temperature)}&wind_speed_unit=${encodeURIComponent(units.windSpeed)}`;
    const res=await fetch(url);
    if(!res.ok){
      throw new Error(`Weather lookup failed with status ${res.status}`);
    }
    const data=await res.json();

    // Validate response structure
    if(!data.current||!data.daily){
      throw new Error("Invalid weather data");
    }

    // current conditions
    const current=data.current;
    const days=data.daily.time;
    const minT=data.daily.temperature_2m_min;
    const maxT=data.daily.temperature_2m_max;
    const codes=data.daily.weather_code;
    const rainChances=data.daily.precipitation_probability_max;
    const dailyWinds=data.daily.wind_speed_10m_max;

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
    const forecast=[];
    
    // Today's forecast card - show "Today" instead of day name
    const todayCode=codes[todayIndex]??0;
    const todayMin=Math.round(minT[todayIndex]??0);
    const todayMax=Math.round(maxT[todayIndex]??0);
    forecast.push({
      label:"Today",
      code:todayCode,
      min:todayMin,
      max:todayMax,
      rainChance:Math.round(rainChances[todayIndex]??0),
      wind:Math.round(dailyWinds[todayIndex]??0)
    });
    
    // Next 3 days forecast (starting from todayIndex+1)
    for(let i=todayIndex+1;i<=todayIndex+3 && i<days.length;i++){
      const date=new Date(days[i]+"T12:00:00"); // Add time to avoid timezone shifts
      const label=date.toLocaleDateString("en-US",{weekday:"short",timeZone:location.timeZone});
      const code=Number(codes[i]??0);
      const min=Math.round(minT[i]??0);
      const max=Math.round(maxT[i]??0);
      forecast.push({
        label,
        code,
        min,
        max,
        rainChance:Math.round(rainChances[i]??0),
        wind:Math.round(dailyWinds[i]??0)
      });
    }

    const weatherData={
      location:{
        label:location.label,
        timeZone:location.timeZone
      },
      current:{
        code:Number(current.weather_code??0),
        temp:Math.round(current.temperature_2m??0),
        feelsLike:Math.round(current.apparent_temperature??0),
        humidity:Math.round(current.relative_humidity_2m??0),
        wind:Math.round(current.wind_speed_10m??0),
        rainChance:Math.round(rainChances[todayIndex]??0),
        condition:getWeatherLabel(Number(current.weather_code??0))
      },
      forecast
    };

    renderWeather(c,weatherData,units);
    writeCachedWeatherData(config,weatherData);
  }catch(err){
    console.error(err);
    if(cachedWeather){
      renderWeather(c,cachedWeather,units);
      return;
    }
    c.innerHTML="<div class='loading'>Weather unavailable</div>";
  }
}
