# Changelog

## 1.0.22 — 2026-08-18

> [!IMPORTANT]
> The plugin is now named **AmpSearch** and the file is now `AmpSearch.plugin.js`. Remove the old `GlobalUserSearch.plugin.js` copy and install the new file manually once to avoid loading both plugins.

### Fixed
- **Message search failed on every target with `t[1].toLowerCase is not a function`** — the simplified module lookup could select an unrelated Discord module that happened to expose `get` and `post`. AmpSearch now checks REST candidates against Discord's authenticated user endpoint before sending search requests and re-resolves the module if Discord swaps it during a session
- Global DM search and per-server tab search now use the verified REST module instead of falling through to malformed legacy responses
- User results no longer drift into the vertical center of the Quick Switcher. Rows no longer inherit Discord's virtualized result positioning, and the results host is explicitly top-aligned
- Duplicate pagination guard removed from the load-more path
- Equal message ids now return `0` from the result sorter instead of producing an unstable order

### Improved
- Renamed `UserGlobalSearch` to **AmpSearch** across the plugin, file name, metadata, package, documentation, tests and links
- Console output is now English-only
- Removed every non-metadata source comment from the distributed plugin file
- Updated the README and tests to match the current feature set and file name

## 1.0.2 — 2026-08-18

### Added
- **Infinite scroll in message results** — reaching the bottom of the list loads the next pages automatically until there are no more messages. Cursor-based pagination on the current endpoint, `offset` fallback on the legacy one. Duplicates are filtered by message id, and if the API ever ignores the cursor, the target stops instead of looping the same page
- Server message rows now show the channel: `#general · ServerName`
- Final results counter in the header once the search finishes ("found 38")
- Messages with attachments but no text show the file name (or "Embed") instead of an empty row

### Fixed
- **Message mode fired up to 6 HTTP requests per keystroke** — unlike user mode, it was never debounced. Message mode now has its own debounce (400 ms floor), and switching modes cancels the stale search instead of letting it overwrite fresh results
- The list no longer jumps to the top on every batch while loading — scroll position is preserved
- Highlighting matched only the first occurrence and broke on double spaces / ё — now highlights all occurrences, whitespace-safe
- Cache key ignored the current server set and limits (stale results after joining a server); cache hits now render instantly without a fake "0/48" spinner
- Transient failures (5xx, timeouts) get one retry instead of instantly counting as target errors
- Raw queries were logged to the console on every keystroke — moved to debug level
- The plugin could stay active with an empty input after Discord re-rendered the switcher mid-session

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
