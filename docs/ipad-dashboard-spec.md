# iPad dashboard redesign spec

Status: Implementation in progress on the review branch.
Date: October 16, 2026
Branch: `codex/ipad-today-spec`

## Outcome

Make a landscape iPad useful at a glance: show the time, current weather, and what is coming next without waiting for a slideshow. Preserve the personal feel of family photos and keep detailed views one tap away.

This document records the agreed first-version direction and implementation scope.

## Evidence and limits

The existing local source contains four full-screen slides: embedded Google Calendar, weather, photos, and quotes. Each receives 60 seconds. Calendar defaults to a week view and uses a color-inversion filter. Weather includes current conditions and four daily forecast cards. Navigation uses arrows and 10–12px dots. Weather can fall back to cached data without displaying its age.

These findings come from `index.html`, `css/style.css`, and the JavaScript files. The browser preview timed out during the initial review. The rendered layout, calendar authentication, iPad model, Safari version, mounting distance, and live deployment have not been verified.

Do not treat this spec as evidence that any proposed layout has passed device testing.

## Working assumptions

- The primary device is a landscape iPad, often viewed without touching it.
- Today’s schedule and weather are the main practical information; photos provide the ambient element.
- Keep Chicago, America/Chicago, Celsius, and mph as currently configured. Do not silently change unit preferences.
- Keep the existing static HTML/CSS/JavaScript architecture unless calendar access requires a separately reviewed service.
- Preserve the existing calendar source. Adding a Family calendar requires an explicit source choice and access verification.
- Portrait and Safari browser mode should remain usable, even though landscape standalone mode is the primary target.

These are proposed defaults, not confirmed facts about the user’s viewing setup.

## Scope

### First version

1. A persistent Today screen with time, weather, calendar, and family photo.
2. Labeled navigation to Today, Calendar, Weather, and Photos.
3. A compact daily forecast with comparable temperature ranges.
4. Readable typography, restrained surfaces, and reliable loading/error states.
5. Explicit weather freshness and offline status.
6. Existing photo collection and full calendar access preserved.

### Deferred

- AI summaries, chat, recommendations, or generated daily briefings.
- Hourly rain charts, radar, air quality, and severe-weather alerts, which need additional data and validation.
- Tasks, chores, habit tracking, new calendar sources, or calendar editing.
- New backend, OAuth integration, or public deployment without a separate implementation decision.
- Fully offline calendar access. A saved shell alone cannot make the embedded calendar work offline.

## Screen structure

### Today: the default screen

Use a stable layout that fits one landscape viewport without page scrolling.

| Region | Starting allocation | Content |
| --- | --- | --- |
| Header | Minimal | Omitted; Safari supplies time/date and the current temperature appears inside Today in the forecast strip |
| Main left | Approximately 40% of main width | Family photo, shown in full and changed automatically every four minutes |
| Main right | Approximately 60% of main width | Today’s schedule / Google Calendar agenda |
| Footer | Reserved control area | Today, Calendar, Weather, Photos; optional ambient-mode control |

Percentages are starting constraints for a prototype, not fixed pixel requirements. Calendar readability takes precedence over fitting more decorative content.

Keep time, weather, and navigation in consistent positions. Let the calendar provide the date context on Today. A photo transition must not move adjacent information. Reserve safe-area space and prevent navigation from covering content.

### Calendar: a dependency that must be resolved honestly

The current iframe does not provide event data to the parent page. A custom agenda, next-event countdown, and tomorrow preview cannot be built reliably by reading that cross-origin iframe.

**First-version baseline:** use Google Calendar’s embedded agenda mode on Today if it loads and remains readable in the allocated space. Keep the existing week view on the dedicated Calendar screen. Clearly label the embedded region “Upcoming schedule”; do not imply that every event shown is today’s event.

Verify this baseline in the browser before committing to the visual layout. If the embed is blocked or unreadable, present the limitation and revise the allocation; do not substitute invented events or silently introduce new authorization.

**Optional later enhancement:** after agreeing on authenticated calendar access, render a native agenda with the next event, relative start time, and three to five upcoming events. This requires separate agreement on permissions, hosting, refresh behavior, and token handling. A static public file must never contain credentials.

The first version must not display “No events today” when calendar access has failed. With an iframe, loading its document is not proof that calendar data is accessible; keep an “Open Google Calendar” action available.

### Weather: summary and detail

On Today, put the current temperature inside the Today forecast cell, then show four compact daily rows. Each row shows day, condition icon, labeled low/high values, a temperature range, and rain probability. Keep current condition details in the Weather view.

- Use one shared temperature scale across the visible days. Each range spans that day’s low to high; retain numeric values so color or position is never the only explanation.
- Label the rain value “Rain chance today” or by forecast day. It comes from daily maximum precipitation probability and is not a current rain measurement.
- Keep feels-like temperature and wind in the detailed Weather view. Humidity and wind direction are secondary information.
- Display Celsius explicitly; preserve the existing mph setting.
- Show the last successful fetch time. If a refresh fails, retain the last result with “Offline or unable to refresh · updated …”.
- Treat weather older than 30 minutes as stale and weather from a previous local date as unsuitable for an unlabeled “Today” forecast. These are proposed product thresholds, not provider guarantees.
- If there is no cached result, show a short unavailable message and a retry control. Missing values appear as unavailable, never as fabricated zeroes.

Weather detail may scroll when necessary. Today’s essential information must remain visible without scrolling on the supported landscape sizes.

### Photos and quotes

Use the existing photo list. Contain images by default so faces are not cropped; fill unused frame space with a subdued, softly blurred version of the same photo. Preserve a full-screen Photos view.

Load the next photo before fading out the current one. On failure, keep the current image or show a quiet unavailable state. Do not leave an empty broken-image frame.

Keep quotes out of navigation, but show one in a compact banner above the Today layout. Rotate the quote every 60 seconds without changing views; use the existing API, cache, and local fallback behavior.

## Visual direction

- Keep the existing dark foundation, with more opaque surfaces and fewer nested cards.
- Remove the heavy vignette and decorative glow from information views. Avoid applying a blanket color-inversion filter to calendar content without checking event-color legibility.
- Use a single font family, clear weight hierarchy, and one interaction accent. Preserve calendar colors where practical, but do not rely on color alone to identify events.
- Keep current temperature visually distinct within the Today forecast cell; use 24–28px primary agenda text where controlled by the app, and 18–20px supporting text. These are CSS pixels and must be adjusted against real iPad viewing distance.
- Use consistent spacing and a modest corner radius. Increase information clarity before adding visual decoration.
- Use a consistent weather icon family, with text descriptions alongside important conditions.

## Interaction and accessibility

- Start on Today. Disable automatic full-screen rotation by default.
- Provide labeled controls with touch areas of at least 44 × 44 CSS pixels, visible selected state, and keyboard focus.
- Selecting a detailed view keeps it open until the user returns; no timer takes the user away.
- Photos change automatically every four minutes while the main information remains visible. Include an explicit manual next-photo control.
- Respect reduced-motion preferences. Avoid continuous animated weather icons; use brief, restrained transitions.
- Keep hidden views out of keyboard navigation and the accessibility tree.
- Give meaningful images and controls accessible names. Use semantic regions and headings; do not announce the clock every minute to screen readers.
- Target at least 4.5:1 text contrast for normal text and 3:1 for large text. Verify measured contrast during implementation; this document does not claim compliance.

## Device behavior and resilience

- Check 1024 × 768 and 1180 × 820 CSS-pixel landscape viewports as representative targets, then test the actual iPad once identified.
- Also check 768 × 1024 portrait and narrower split-screen widths. Reflow into a readable stack instead of shrinking the entire dashboard.
- Account for standalone safe areas and Safari’s changing browser chrome. Do not assume `90vh` always represents the usable content area.
- Refresh time/date on resume, handle local midnight correctly, and refresh weather when returning after a long background period.
- Keep clock, cached weather, and available local photos useful when a network request fails. Do not promise a reloadable offline app without implementing and checking asset caching separately.
- Keep startup lightweight. Profile on the actual device before claiming a performance improvement from reducing blur or animation.

## Acceptance criteria

1. Today is the initial screen and essential information does not automatically disappear.
2. At both representative landscape sizes, header, calendar region, photo, forecast, and navigation fit without overlap or page scrolling.
3. Calendar access is checked with the actual account context. A failed embed is not represented as an empty schedule. Week view remains available.
4. Forecast ranges share a scale, retain labeled numeric lows/highs, and handle equal or missing values.
5. Rain probability has an accurate time scope and units remain consistent with existing configuration.
6. Weather displays its successful update time; failed refresh, stale cache, previous-day cache, and no-cache states are distinguishable.
7. Every navigation control works by touch and keyboard, has a visible focus state, and meets the proposed touch-area size.
8. Reduced motion is respected, and hidden views cannot receive focus.
9. Portrait and split-screen layouts remain readable; the actual iPad is checked before calling the design device-verified.
10. A failed photo load does not remove the last good image or show a broken image icon.
11. Existing calendar configuration and photo collection remain intact, and no credentials or fabricated live data are introduced.

## Implementation sequence after spec review

1. Verify the existing app in a working browser, confirm the actual iPad size and viewing distance, and check embedded agenda feasibility.
2. Build the Today layout and labeled navigation on this separate branch using the existing stack.
3. Add compact forecasts, weather freshness, and failure states; preserve dedicated detail views.
4. Verify the acceptance criteria with browser screenshots, representative sizes, failure scenarios, and then the actual iPad.
5. Present the local preview and remaining limitations for review. Publishing or merging is a separate step.

## Decisions recorded during review

- The first concept is preferred: keep dashboard information visible together and use labeled navigation for full-detail views.
- Use family photo on the left and today’s schedule on the right. The user’s calendar is generally personal and expected to be relatively light.
- Rotate the photo automatically every four minutes, with a manual next-photo control on Today.
- Continue using the existing calendar source and keep a full-calendar view available.
- Omit both the header date and clock: Safari's status bar already displays the current date and time, while the agenda supplies calendar date context. Use the freed vertical space for the photo, agenda, and forecast.
- Remove the separate current-weather header block and place the current temperature centered within the Today forecast cell. Keep all four day cells equal in width.
- Restore the rotating quote in a compact top banner; rotate every 60 seconds while keeping the dashboard view fixed.

No answers are required to review this document. Implementation should resolve the calendar feasibility and device constraints before promising the final layout.
