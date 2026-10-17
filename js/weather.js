// WEATHER – use Open-Meteo for reliable current + 3-day forecast
// Map weather codes to emoji (WMO Weather Interpretation Codes)
const WEATHER_LOCATION_CACHE_PREFIX="wall-dashboard-weather-location:";
const WEATHER_LOCATION_CACHE_TTL=1000*60*60*24*7; // 7 days
const WEATHER_DATA_CACHE_PREFIX="wall-dashboard-weather-data:";
let weatherRefreshInFlight=false;
let resolvedWeatherLocation=null;
let weatherLocationPromise=null;

function nullableRounded(value){
  return Number.isFinite(value)?Math.round(value):null;
}

function nullableDirection(degrees){
  return Number.isFinite(degrees)?getWindDirectionLabel(degrees):"";
}

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
    const isNullableNumber=value=>value===null||Number.isFinite(value);
    if(
      !parsed||
      !parsed.location||
      !Array.isArray(parsed.forecast)||
      !parsed.current||
      !isNullableNumber(parsed.current.temp)||
      !isNullableNumber(parsed.current.feelsLike)||
      !isNullableNumber(parsed.current.humidity)||
      !isNullableNumber(parsed.current.wind)||
      !isNullableNumber(parsed.current.rainChance)||
      typeof parsed.current.condition!=="string"||
      typeof parsed.current.windDirection!=="string"||
      parsed.forecast.length===0||
      parsed.forecast.some(day=>
        !day||
        typeof day.label!=="string"||
        !isNullableNumber(day.code)||
        !isNullableNumber(day.min)||
        !isNullableNumber(day.max)||
        !isNullableNumber(day.rainChance)||
        !isNullableNumber(day.wind)||
        typeof day.windDirection!=="string"
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
    weatherData.fetchedAt=Date.now();
    localStorage.setItem(getWeatherDataCacheKey(config),JSON.stringify(weatherData));
  }catch(err){
    console.warn("Unable to cache weather",err);
  }
}

function getWeatherIconName(code){
  if(!Number.isFinite(code))return "question_mark";
  if(code===0)return "sunny";
  if([1,2].includes(code))return "partly_cloudy_day";
  if(code===3)return "cloud";
  if([45,48].includes(code))return "foggy";
  if([51,53,55,56,57].includes(code))return "rainy";
  if([61,63,65,80,81,82].includes(code))return "rainy";
  if([66,67,71,73,75,77,85,86].includes(code))return "weather_snowy";
  if([95,96,99].includes(code))return "thunderstorm";
  return "partly_cloudy_day";
}

function getWeatherIconTone(code){
  if(!Number.isFinite(code))return "weather-icon--unknown";
  if(code===0)return "weather-icon--sunny";
  if([1,2].includes(code))return "weather-icon--partly-cloudy";
  if(code===3)return "weather-icon--cloudy";
  if([45,48].includes(code))return "weather-icon--fog";
  if([51,53,55,56,57,61,63,65,80,81,82].includes(code))return "weather-icon--rain";
  if([66,67,71,73,75,77,85,86].includes(code))return "weather-icon--snow";
  if([95,96,99].includes(code))return "weather-icon--storm";
  return "weather-icon--unknown";
}

function weatherIcon(code, extraClass=""){
  return `<span class="material-symbols-outlined weather-icon ${getWeatherIconTone(code)} ${extraClass}" aria-hidden="true">${getWeatherIconName(code)}</span>`;
}

function displayNumber(value, suffix=""){
  return Number.isFinite(value)?`${Math.round(value)}${suffix}`:"—";
}

function getTemperatureSymbol(units){
  return units.temperature==="celsius"?"°C":"°F";
}

function formatUpdatedAt(timestamp, timeZone){
  if(!Number.isFinite(timestamp))return "Update time unavailable";
  return new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit",timeZone}).format(new Date(timestamp));
}

function isStaleWeather(weatherData){
  if(!Number.isFinite(weatherData.fetchedAt))return true;
  const age=Date.now()-weatherData.fetchedAt;
  if(age>30*60*1000)return true;
  const dateFormatter=new Intl.DateTimeFormat("en-CA",{timeZone:weatherData.location.timeZone});
  return dateFormatter.format(new Date(weatherData.fetchedAt))!==dateFormatter.format(new Date());
}

function getForecastRange(day, minAcross, maxAcross){
  if(!Number.isFinite(day.min)||!Number.isFinite(day.max))return {left:0,width:0};
  const span=maxAcross-minAcross;
  if(span<=0)return {left:0,width:100};
  return {left:Math.max(0,((day.min-minAcross)/span)*100),width:Math.max(2,((day.max-day.min)/span)*100)};
}

function renderTodayForecast(forecast, units, currentTemperature){
  const target=document.getElementById("todayForecast");
  if(!target)return;
  if(!forecast?.length){target.innerHTML="<div class='loading'>Forecast unavailable</div>";return;}
  const allTemps=forecast.flatMap(day=>[day.min,day.max]).filter(Number.isFinite);
  const minAcross=allTemps.length?Math.min(...allTemps):0;
  const maxAcross=allTemps.length?Math.max(...allTemps):0;
  target.innerHTML=forecast.slice(0,4).map((day,index)=>{
    const range=getForecastRange(day,minAcross,maxAcross);
    return `<article class="forecast-day${index===0?" is-today":""}">
      <span class="forecast-day-name">${day.label}</span>
      ${weatherIcon(day.code,"forecast-icon")}
      ${index===0&&currentTemperature?`<div class="forecast-current" aria-label="Current temperature ${currentTemperature}"><span class="forecast-current-label">Now</span><strong class="forecast-current-temp">${currentTemperature}</strong></div>`:""}
      <div class="forecast-temps" aria-label="Low ${displayNumber(day.min,units.temperature==="celsius"?"°C":"°F")}, high ${displayNumber(day.max,units.temperature==="celsius"?"°C":"°F")}">
        <div class="forecast-numbers"><span>${displayNumber(day.min,units.temperature==="celsius"?"°":"°")}</span><span>${displayNumber(day.max,units.temperature==="celsius"?"°":"°")}</span></div>
        <div class="forecast-range" aria-hidden="true"><span style="left:${range.left.toFixed(2)}%;width:${range.width.toFixed(2)}%"></span></div>
      </div>
      <span class="forecast-rain">Rain chance<strong>${displayNumber(day.rainChance,"%")}</strong></span>
    </article>`;
  }).join("");
}

function renderWeather(container, weatherData, units){
  if(!weatherData)return;
  const {current,location,forecast}=weatherData;
  const symbol=getTemperatureSymbol(units);
  const stale=isStaleWeather(weatherData);
  const updated=formatUpdatedAt(weatherData.fetchedAt,location.timeZone);
  window.dashboardTimeZone=location.timeZone;

  renderTodayForecast(forecast,units,`${displayNumber(current.temp)}${symbol}`);
  const forecasts=forecast.slice(0,4);
  const allTemps=forecasts.flatMap(day=>[day.min,day.max]).filter(Number.isFinite);
  const minAcross=allTemps.length?Math.min(...allTemps):0;
  const maxAcross=allTemps.length?Math.max(...allTemps):0;
  const forecastHtml=forecasts.map(day=>{
    const range=getForecastRange(day,minAcross,maxAcross);
    return `<article class="forecast-card">
      <div class="date">${day.label}</div>
      <div class="icon">${weatherIcon(day.code,"forecast-icon")}</div>
      <div class="temp-stack"><span class="temp-primary">High ${displayNumber(day.max,symbol)}</span><span class="temp-secondary">Low ${displayNumber(day.min,symbol)}</span></div>
      <div class="forecast-range" aria-label="Temperature range"><span style="left:${range.left.toFixed(2)}%;width:${range.width.toFixed(2)}%"></span></div>
      <div class="detail">Rain chance today: ${displayNumber(day.rainChance,"%")}</div>
      <div class="detail">Wind ${displayNumber(day.wind)} ${units.windLabel} ${day.windDirection||""}</div>
    </article>`;
  }).join("");
  const stats=[
    {label:"Wind",value:`${displayNumber(current.wind)} ${units.windLabel}`,meta:current.windDirection,icon:"air"},
    {label:"Humidity",value:displayNumber(current.humidity,"%"),meta:"",icon:"humidity_percentage"},
    {label:"Feels like",value:displayNumber(current.feelsLike,symbol),meta:"",icon:"device_thermostat"},
    {label:"Rain chance today",value:displayNumber(current.rainChance,"%"),meta:"Daily forecast maximum",icon:"rainy"}
  ].map(stat=>`<div class="weather-stat"><span class="material-symbols-outlined" aria-hidden="true">${stat.icon}</span><div class="weather-stat-label">${stat.label}</div><div class="weather-stat-value">${stat.value}</div>${stat.meta?`<div class="weather-stat-meta">${stat.meta}</div>`:""}</div>`).join("");

  if(container){
    container.innerHTML=`<div class="weather-summary">${weatherIcon(current.code,"weather-summary-icon")}<div><div class="weather-summary-temp">${displayNumber(current.temp)}${symbol}</div><div class="weather-summary-condition">${current.condition}</div><div class="weather-location">${location.label}</div></div></div>
      <div class="weather-stats">${stats}</div>
      <div class="weather-forecast">${forecastHtml}</div>
      <p class="weather-status ${stale?"is-stale":""}" role="status">${stale?"Offline or unable to refresh · ":""}Last successful update ${updated}</p>`;
  }
  const updatedDetail=document.getElementById("weatherUpdatedDetail");
  if(updatedDetail)updatedDetail.textContent=`${stale?"Offline · last successful update":"Updated"} ${updated}`;
}

function showWeatherUnavailable(){
  const forecast=document.getElementById("todayForecast");
  if(forecast)forecast.innerHTML="<div class='loading'>Forecast unavailable</div>";
  const container=document.getElementById("weatherContainer");
  if(container){
    container.innerHTML="<div class='loading'>Weather is unavailable right now.</div><button class='retry-button' id='retryWeatherButton'>Try again</button>";
    document.getElementById("retryWeatherButton").addEventListener("click",()=>loadWeather());
  }
}

function getWeatherLabel(code){
  if(!Number.isFinite(code))return "Conditions unavailable";
  if(code===0) return "Clear";
  if([1,2].includes(code)) return "Partly cloudy";
  if(code===3) return "Cloudy";
  if([45,48].includes(code)) return "Fog";
  if([51,53,55,56,57].includes(code)) return "Drizzle";
  if([61,63,65,80,81,82].includes(code)) return "Rain";
  if([66,67,71,73,75,77,85,86].includes(code)) return "Snow";
  if([95,96,99].includes(code)) return "Storms";
  return "Conditions unavailable";
}

function getWindDirectionLabel(degrees){
  if(!Number.isFinite(degrees))return "";
  const normalized=((degrees%360)+360)%360;
  const directions=["N","NE","E","SE","S","SW","W","NW"];
  const index=Math.round(normalized/45)%8;
  return directions[index];
}

async function loadWeather(){
  const c=document.getElementById("weatherContainer");
  if(!c||weatherRefreshInFlight)return;
  weatherRefreshInFlight=true;
  const config=getWeatherConfig();
  const units=getWeatherUnits(config);
  const cachedWeather=readCachedWeatherData(config);

  try{
    const location=await resolveWeatherLocation();
    const url=`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(location.latitude)}&longitude=${encodeURIComponent(location.longitude)}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant&timezone=${encodeURIComponent(location.timeZone)}&temperature_unit=${encodeURIComponent(units.temperature)}&wind_speed_unit=${encodeURIComponent(units.windSpeed)}`;
    const res=await fetch(url,{cache:"no-store"});
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
    const days=data.daily.time||[];
    const minT=data.daily.temperature_2m_min;
    const maxT=data.daily.temperature_2m_max;
    const codes=data.daily.weather_code;
    const rainChances=data.daily.precipitation_probability_max;
    const dailyWinds=data.daily.wind_speed_10m_max;
    const dailyWindDirections=data.daily.wind_direction_10m_dominant;

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
    if(!days.length)throw new Error("No daily forecast data");

    // build forecast: today's min/max and next 3 days
    const forecast=[];
    
    // Today's forecast card - show "Today" instead of day name
    const todayCode=nullableRounded(codes?.[todayIndex]);
    const todayMin=nullableRounded(minT?.[todayIndex]);
    const todayMax=nullableRounded(maxT?.[todayIndex]);
    forecast.push({
      label:"Today",
      code:todayCode,
      min:todayMin,
      max:todayMax,
      rainChance:nullableRounded(rainChances?.[todayIndex]),
      wind:nullableRounded(dailyWinds?.[todayIndex]),
      windDirection:nullableDirection(dailyWindDirections?.[todayIndex]??current.wind_direction_10m)
    });
    
    // Next 3 days forecast (starting from todayIndex+1)
    for(let i=todayIndex+1;i<=todayIndex+3 && i<days.length;i++){
      const date=new Date(days[i]+"T12:00:00"); // Add time to avoid timezone shifts
      const label=date.toLocaleDateString("en-US",{weekday:"short",timeZone:location.timeZone});
      const code=nullableRounded(codes?.[i]);
      const min=nullableRounded(minT?.[i]);
      const max=nullableRounded(maxT?.[i]);
      forecast.push({
        label,
        code,
        min,
        max,
        rainChance:nullableRounded(rainChances?.[i]),
        wind:nullableRounded(dailyWinds?.[i]),
        windDirection:nullableDirection(dailyWindDirections?.[i])
      });
    }

    const weatherData={
      location:{
        label:location.label,
        timeZone:location.timeZone
      },
      current:{
        code:nullableRounded(current.weather_code),
        temp:nullableRounded(current.temperature_2m),
        feelsLike:nullableRounded(current.apparent_temperature),
        humidity:nullableRounded(current.relative_humidity_2m),
        wind:nullableRounded(current.wind_speed_10m),
        rainChance:nullableRounded(rainChances?.[todayIndex]),
        condition:getWeatherLabel(current.weather_code),
        windDirection:nullableDirection(current.wind_direction_10m)
      },
      forecast,
      fetchedAt:Date.now()
    };

    renderWeather(c,weatherData,units);
    writeCachedWeatherData(config,weatherData);
  }catch(err){
    console.error(err);
    if(cachedWeather){
      renderWeather(c,cachedWeather,units);
    }else{
      showWeatherUnavailable();
    }
  }finally{
    weatherRefreshInFlight=false;
  }
}
