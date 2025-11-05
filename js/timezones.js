// TIMEZONES – display multiple time zones
const TIMEZONES = [
  { name: "Spain", zone: "Europe/Madrid", label: "Barcelona" },
  { name: "Pacific Time", zone: "America/Los_Angeles", label: "San Francisco" }
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

// HTML sanitization helper
function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function updateTimezones() {
  const container = document.getElementById("timezonesContainer");
  if (!container) return;

  const now = new Date();
  const html = TIMEZONES.map(tz => {
    const time = escapeHtml(formatTime(now, tz.zone));
    const date = escapeHtml(formatDate(now, tz.zone));
    const label = escapeHtml(tz.label);
    const name = escapeHtml(tz.name);
    return `
      <div class="timezone-card">
        <div class="timezone-label">${label}</div>
        <div class="timezone-name">${name}</div>
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

