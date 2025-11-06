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
    const timeStr = formatTime(now, tz.zone);
    // Split time and AM/PM
    const timeMatch = timeStr.match(/^(\d{1,2}:\d{2})\s*(AM|PM)$/);
    const time = escapeHtml(timeMatch ? timeMatch[1] : timeStr);
    const ampm = timeMatch ? escapeHtml(timeMatch[2]) : '';
    const date = escapeHtml(formatDate(now, tz.zone));
    const label = escapeHtml(tz.label);
    const name = escapeHtml(tz.name);
    return `
      <div class="timezone-card">
        <div class="timezone-label">${label}</div>
        <div class="timezone-name">${name}</div>
        <div class="timezone-time-wrapper">
          <div class="timezone-time">${time}</div>
          ${ampm ? `<span class="timezone-ampm">${ampm}</span>` : ''}
        </div>
        <div class="timezone-date">${date}</div>
      </div>
    `;
  }).join("");

  container.innerHTML = html;
}

// Initialize and update every second
updateTimezones();
setInterval(updateTimezones, 1000);

