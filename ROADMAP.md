# RobloxGlop — UI & product improvement roadmap

This roadmap is based on the current `index.html` implementation: a single-page Roblox script library with a home view, A–Z archive, Firebase-backed script submissions, embedded previews, access/key flows, and advertising placements.

## Delivered in this branch

- [x] Add a compact library overview with live script and saved-script counts.
- [x] Add local favorites that persist in the visitor's browser.
- [x] Add one-tap copy/share links for script pages.
- [x] Add archive A–Z / Z–A sorting, A–Z letter filters, and a saved-only filter.
- [x] Add live archive result counts and a useful empty-filter message.
- [x] Lazy-load embedded preview frames to reduce initial page work.
- [x] Improve keyboard access with visible focus states, `/` and Ctrl/Cmd+K search shortcuts, and Escape-to-clear.
- [x] Replace the blanket “Verified” card label with “Community” because the current code does not implement a real review/verification process.
- [x] Add responsive styling and reduced-motion support without replacing the existing Firebase or access-flow logic.

## 20 strong next improvements

### Discovery and interface
1. **Real categories and tags** — add fields such as executor, game, script type, and supported version; use them for multi-filter search.
2. **Search suggestions** — show matching script names while typing, with keyboard navigation and a clear no-match state.
3. **Dedicated script detail pages** — show full description, preview, update date, author, and access action instead of sending every visitor straight into the access flow.
4. **Script thumbnails** — support a validated image URL or uploaded thumbnail, with a consistent fallback icon.
5. **Featured collections** — curate “new”, “popular”, “beginner-friendly”, and game-specific collections using actual stored metadata.
6. **Recently viewed list** — let visitors reopen scripts they recently inspected.
7. **Changelog and version history** — show when a script was updated and what changed.
8. **Better mobile navigation** — use a compact menu and larger touch targets on small screens.
9. **Consistent language and copy** — standardize labels, errors, dates, and button wording across the home, archive, key and access views.
10. **Loading and failure states** — add skeleton cards, retry controls, and a visible Firebase connection/error message instead of silently swallowing load failures.

### Community and trust
11. **Submission moderation queue** — keep new submissions pending until an admin approves them.
12. **Report button** — let visitors report broken, malicious, misleading, or stolen scripts; route reports to an admin-only queue.
13. **Author profiles** — show the creator, their other scripts, and a clear attribution trail.
14. **Useful feedback signals** — collect likes or helpful votes with rate limits; do not present unverified scripts as “verified”.
15. **Script health checks** — periodically check whether preview and source links still work, and show the last checked date.

### Reliability, security and performance
16. **Move sensitive access decisions server-side** — the current `STATIC_KEYS` array is shipped to every browser, so these values are not secret. Never use client-side constants as protected keys.
17. **Use server-validated verification** — a math challenge calculated in browser JavaScript can be bypassed; verify challenges and access claims on a trusted backend.
18. **Lock down Firebase rules** — validate field types and lengths, restrict who can publish, add abuse controls, and avoid unrestricted public writes.
19. **Add observability and backups** — record failed loads/submissions, monitor Firestore usage, and schedule database exports before larger feature work.
20. **Automated quality checks** — add HTML/JS linting, link validation, mobile viewport checks, accessibility checks, and a deployment smoke test.

## Suggested implementation order

| Phase | Scope | Priority |
|---|---|---|
| 1. Ship the interface foundation | Favorites, sharing, archive filters, counts, accessibility, responsive polish | Done in this branch |
| 2. Make discovery smarter | Categories/tags, suggestions, detail pages, thumbnails, recent views | High |
| 3. Build community trust | Moderation, reports, author profiles, feedback, link health checks | High |
| 4. Secure and stabilize | Server-side key/verification logic, Firebase rules, backups, monitoring, automated tests | Critical before scaling |

## Important current-code risks to resolve before calling the platform secure

- `STATIC_KEYS` is embedded in the browser bundle. Anyone can inspect the page source or downloaded JavaScript and extract it.
- The current CAPTCHA answer is generated and checked in client-side JavaScript. It is a usability challenge, not a security boundary.
- Blocking the context menu or developer-tools shortcuts does not protect scripts or secrets.
- The upload handler writes directly to Firestore from the browser. Production rules must enforce authentication/authorization, validation, rate limits, and moderation.
- The “I VIEWED IT” step is a user confirmation in the page; it is not proof that an ad provider verified a rewarded view.

The current UI branch deliberately leaves these access and advertising flows untouched. The security work should be implemented and tested separately, with Firebase rules and a trusted backend, rather than being hidden inside a visual redesign.
