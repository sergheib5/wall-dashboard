// TIMEZONES – display multiple time zones
const TIMEZONES = [
  { name: "Poland", zone: "Europe/Warsaw", label: "Warsaw" },
  { name: "Barcelona", zone: "Europe/Madrid", label: "Barcelona" },
  { name: "San Francisco", zone: "America/Los_Angeles", label: "San Francisco" }
];

function formatTime(date, zone) {
  return date.toLocaleTimeString("en-US", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

function formatDate(date, zone) {
  return date.toLocaleDateString("en-US", {
    timeZone: zone,
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function updateTimezones() {
  const container = document.getElementById("timezonesContainer");
  if (!container) return;

  const now = new Date();
  const html = TIMEZONES.map(tz => {
    const time = formatTime(now, tz.zone);
    const date = formatDate(now, tz.zone);
    return `
      <div class="timezone-card">
        <div class="timezone-label">${tz.label}</div>
        <div class="timezone-name">${tz.name}</div>
        <div class="timezone-time">${time}</div>
        <div class="timezone-date">${date}</div>
      </div>
    `;
  }).join("");

  container.innerHTML = html;
}

// Initialize and update every second
updateTimezones();
setInterval(updateTimezones, 1000);

