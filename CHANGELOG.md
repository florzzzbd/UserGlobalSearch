# Changelog

## 1.0.1 — 2026-08-17

### Fixed
- `@source` / `@updateUrl` pointed to `UserGlobalSearch.plugin.js` while the repo file is named `GlobalUserSearch.plugin.js` — auto-updates and the source link led to a 404. **If you are on 1.0.0, reinstall manually once; every update after that installs automatically.**
- `searchConcurrency` was silently reset to 6 on every launch whenever it was set to 2 or 4
- Message rows now sync mouse hover with keyboard selection
- If Discord hot-swaps its HTTP module mid-session, the REST layer re-resolves it instead of failing until restart
- The DOM observer now skips irrelevant mutations (less CPU on busy clients)

### Improved
- Message mode resolves multi-word display names: `&Some User text`
- Ctrl+Enter / Cmd+Enter on a user opens the DM or profile directly (Enter still opens message search)
- Message timestamps show relative time ("yesterday", "2 days ago") in your Discord locale; falls back to a full date after 30 days
- Visual polish toward native: `--brand-500` color chain, status dot size/border, native-like row padding, thin native-style scrollbar
- Accessibility: results host is `role="listbox"`, rows expose ids, the input gets `aria-activedescendant`
- Removed dead code (unused constants, stray `innerHTML`)
